// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EngagementOracle {
    struct Engagement {
        uint256 lastUpdated;
        uint value;
    }

    mapping(uint256 => Engagement) _engagement;

    function engagement(uint256 itemId) public view returns (uint) {
        return 0;
    }

    function setEngagement(uint256 itemId, uint amount) public view returns (uint) {
        Engagement storage engagement = _engagement[itemId] ;
        engagement.value = amount;
        engagement.lastUpdated = block.timestamp;
        return 0;
    }
}