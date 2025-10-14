# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn start:debug`
Runs the app in the debug mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

You will see any console output in Chrome console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## LoyaltyPoint contract
<div style="position: relative;">
<button onclick="copyCode(this)" style="position: absolute; top: 10px; right: 10px; z-index: 10; background-color: #605bff; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Copy</button>
```sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract LoyaltyPoint is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public immutable amdToken;
    bytes32 public merkleRoot;

    mapping(address => uint256) public claimed; // total already given (on-chain truth)

    event RootUpdated(bytes32 newRoot);
    event Claimed(address indexed user, uint256 amount);

    constructor(IERC20 _token, bytes32 _root, address _admin) {
        amdToken = _token;
        merkleRoot = _root;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // msg.sender is the owner (multisig)
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, msg.sender); // Grant admin role to the owner as well
    }

    function updateRoot(bytes32 _root) external onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = _root;
        emit RootUpdated(_root);
    }

    // leaf is keccak256(abi.encodePacked(user, cumulativeAmount))
    function claimForUser(address user, uint256 cumulativeAmount, bytes32[] calldata proof) external onlyRole(ADMIN_ROLE) {
        bytes32 leaf = keccak256(abi.encodePacked(user, cumulativeAmount));
        require(MerkleProof.verifyCalldata(proof, merkleRoot, leaf), "bad proof");

        uint256 already = claimed[user];
        require(cumulativeAmount > already, "nothing to claim");
        uint256 toSend = cumulativeAmount - already;

        claimed[user] = cumulativeAmount;
        require(amdToken.transfer(user, toSend), "transfer failed");
        emit Claimed(user, toSend);
    }
}
```
</div>

<script>
function copyCode(button) {
    const codeBlock = button.nextElementSibling;
    const text = codeBlock.innerText;
    navigator.clipboard.writeText(text).then(() => {
        button.innerText = 'Copied!';
        setTimeout(() => {
            button.innerText = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}
</script>