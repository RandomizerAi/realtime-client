# Randomizer Sequencer Client

Listen for Randomizer VRF result previews in real-time, before they're verified on-chain.

You can update your user's interface using the real-time preview (e.g. show the result of a game, update balances, or show the NFT they're minting).

Result previews are extremely likely to be the final on-chain result, since the sequencer can submit the result if the beacon does not submit it in time.

## Installation
`npm i @randomizer.ai/sequencer-client`

## Example

For a full example, see [Realtime Coinflip Example Game](https://github.com/randomizerai/coinflip-example).

### Front-end

```js
import { listenForPreview } from "@randomizer.ai/sequencer-client";
import ethers from "ethers";
const RANDOMIZER_ADDRESS = "0x5fa929b6646e3Bd428dB64e190a421f73587e33F";

// Get the event fired by Randomizer that returns the request ID
// headsOrTails is a boolean
const flip = (headsOrTails) => {

  // Flip for tails
  await contract.flip(headsOrTails);
  const receipt = await tx.wait();

  // Get request ID from the transaction event emitted by the Randomizer contract
  let requestId;
  for (const event of receipt.events) {
    if (event.address === RANDOMIZER_ADDRESS) {
      // Convert event.args[0] (id) to number
      requestId = parseInt(event.topics[1]);
    }
  }

  // Listen for the real-time preview result fired by Randomizer's sequencer (returns a hex string)
  const seed = await listenForPreview(requestId);

  // Forward the result hex as a BigNumber to previewResult
  const result = (await $contracts.coinflip.previewResult(ethers.BigNumber.from(seed)));

  if(headsOrTails === result) {
    // Player won
  } else {
    // Player lost
  }

}

/* Additionally the UI should listen for on-chain FlipResult event and update the state accordingly */

```

### Contract

```cs
interface IRandomizer {
    function request(uint256 callbackGasLimit) external returns (uint128);

    function clientWithdrawTo(address to, uint256 amount) external;
}

contract CoinFlip {
    struct CoinFlipGame {
        address player;
        bool prediction;
        bool result;
        uint256 seed;
    }

    event Flip(address indexed player, uint256 indexed id, bool prediction);

    event FlipResult(
        address indexed player,
        uint128 indexed id,
        uint256 seed,
        bool prediction,
        bool result
    );

    mapping(uint128 => CoinFlipGame) coinFlipGames;
    mapping(address => uint128[]) userToGames;
    mapping(uint128 => bool) gameToHeadsTails;

    IRandomizer private randomizer;

    constructor(address _randomizer) {
        randomizer = IRandomizer(_randomizer);
    }

    // Called by player to initiate a coinflip
    // Using randomizer's request id as the game id
    function flip(bool prediction) external {
        uint128 id = IRandomizer(randomizer).request(20000);
        userToGames[msg.sender].push(id);
        coinFlipGames[id] = CoinFlipGame(msg.sender, prediction, false, 0);
        emit Flip(msg.sender, id, prediction);
    }

    // Previews the outcome of a game based on the seed, used for realtime result previews sent by Randomizer Sequencer.
    function previewResult(bytes32 value) external pure returns (bool) {
        bool headsOrTails = (uint256(value) % 2 == 0);
        return headsOrTails;
    }

    // The callback function called by randomizer when the random bytes are ready
    function randomizerCallback(uint128 _id, bytes32 _value) external {
        require(
            msg.sender == address(randomizer),
            "Only the randomizer contract can call this function"
        );
        CoinFlipGame memory game = coinFlipGames[_id];
        uint256 seed = uint256(_value);
        game.seed = seed;
        bool headsOrTails = (seed % 2 == 0);
        game.result = headsOrTails;
        emit FlipResult(game.player, _id, seed, game.prediction, headsOrTails);
    }
}
```

