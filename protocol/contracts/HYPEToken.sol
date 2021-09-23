// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HYPEToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Hype", "HYPE") {
        _mint(msg.sender, initialSupply);
    }
}