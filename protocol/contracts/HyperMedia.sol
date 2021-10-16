// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libraries/Base64.sol";


contract HyperMedia is Ownable, ERC721, ERC721Enumerable, ERC721URIStorage {
    using Strings for uint256;
    using Counters for Counters.Counter;

    struct HyperMedia {
        uint numSources;
        uint[] sources;
        address creator;
        string sourceCID;
        string imageCID;
    }

    // Tracks the last minted token ID.
    Counters.Counter private _tokenIds;

    // Tracks metadata of Hyper objects.
    mapping(uint256 => HyperMedia) public media;

    // The external URL base for the ERC721 metadata field, "external_uri".
    string public externalUrlBase;

    constructor() 
        ERC721("Hyper Media", "HYPER.0")
    {}

    function setExternalURLBase(string calldata _externalURLBase) public onlyOwner {
        // http://localhost:3001/?cid=bafybeiegtv4jzjk7qzjlbz43tbyxi5hvbyyv6emblnfys7kn7dbd4akli4
        externalUrlBase = _externalURLBase;
    }
    
    function create(uint256[] calldata sources, string calldata imageCID, string calldata sourceCID) public returns (uint256) {
        address creator = msg.sender;
        
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(creator, newItemId);
        
        media[newItemId] = HyperMedia({
            creator: creator,
            numSources: sources.length,
            sources: sources,
            imageCID: imageCID,
            sourceCID: sourceCID
        });

        return newItemId;
    }

    /*
    {
        "name": "Hyper Object #0",
        "image": "ipfs://111111111",
        "source": "ipfs://22222222",
        "external_url": "https://hyper.eth/object/0"
    }
    */
    function tokenURI(uint256 tokenId) override(ERC721, ERC721URIStorage) public view returns (string memory output) {
        HyperMedia memory object = media[tokenId];

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "Hyper Object #', tokenId.toString(), '", "image": "ipfs://', object.imageCID, '", "source":"ipfs://', object.sourceCID, '", "external_url": "', externalUrlBase, '/object/', tokenId.toString(), '" }'))));
        output = string(abi.encodePacked('data:application/json;base64,', json));

        return output;
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}