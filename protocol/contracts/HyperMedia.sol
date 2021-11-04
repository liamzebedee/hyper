// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libraries/Base64.sol";

// library DynamicArrays {
//     function push(uint256[] array) pure {
        
//     }

//     // address[] memory array = new address[](markets.length);
//     // uint count = 0;
//     // for(uint i = 0; i < markets.length; i++) {
//     // if(markets[i].enabled) array[count++] = markets[i]
//     // }
//     // // the neat hack
//     // assembly {
//     // mstore(array, count)
//     // }
//     // return array
// }

contract HyperMedia is Ownable, ERC721, ERC721Enumerable, ERC721URIStorage {
    using Strings for uint256;
    using Strings for string;
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
    mapping(string => uint256) public cidToToken;

    // The external URL base for the ERC721 metadata field, "external_uri".
    string public externalUrlBase;

    constructor() 
        ERC721("Hyper Media", "HYPER.0")
    {
        _tokenIds.increment();
    }

    function setExternalURLBase(string calldata _externalURLBase) public onlyOwner {
        // http://localhost:3001/?cid=bafybeiegtv4jzjk7qzjlbz43tbyxi5hvbyyv6emblnfys7kn7dbd4akli4
        externalUrlBase = _externalURLBase;
    }

    function _create(address creator, uint256[] memory sources, string memory imageCID, string memory sourceCID) internal returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _mint(creator, newItemId);
        _tokenIds.increment();

        media[newItemId] = HyperMedia({
            creator: creator,
            numSources: sources.length,
            sources: sources,
            imageCID: imageCID,
            sourceCID: sourceCID
        });

        cidToToken[imageCID] = newItemId;
        if(keccak256(bytes(imageCID)) != keccak256(bytes(sourceCID))) {
            cidToToken[sourceCID] = newItemId;
        }

        return newItemId;
    }
    
    function create(uint256[] calldata existingSources, string[] calldata newSources, string calldata imageCID, string calldata sourceCID) public returns (uint256) {
        // Locals.
        uint256 i;
        uint256 newItemId;

        require(cidToToken[imageCID] == 0, "err_imageCID_uniq");
        require(cidToToken[sourceCID] == 0, "err_sourceCID_uniq");

        uint256[] memory sources = new uint256[](existingSources.length + newSources.length);
        for(i = 0; i < existingSources.length; i++) {
            sources[i] = existingSources[i];
        }
        
        // Create HyperMedia items for each new source.
        // eg. new assets, symbols, imagery
        // These don't have any sources, they stand on their own.
        uint[] memory emptySources;

        for(i = 0; i < newSources.length; i++) {
            newItemId = _create(
                msg.sender,
                emptySources,
                newSources[i],
                newSources[i]
            );
            sources[existingSources.length + i] = newItemId;
        }

        newItemId = _create(
            msg.sender,
            sources,
            imageCID,
            sourceCID
        );

        return newItemId;
    }

    function getSources(uint256 item) public view returns (uint[] memory) {
        return media[item].sources;
    }

    /*
    https://docs.opensea.io/docs/metadata-standards
    https://eips.ethereum.org/EIPS/eip-721
    {
        "name": "Hyper Object #0",
        "image": "ipfs://111111111",
        "source": "ipfs://22222222",
        "external_url": "https://hyper.eth/object/0"
    }
    */
    function tokenURI(uint256 tokenId) override(ERC721, ERC721URIStorage) public view returns (string memory output) {
        HyperMedia storage object = media[tokenId];

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "Hyper Object #', tokenId.toString(), '", "image": "ipfs:', object.imageCID, '", "source":"ipfs:', object.sourceCID, '", "external_url": "', externalUrlBase, '/object/', tokenId.toString(), '" }'))));
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