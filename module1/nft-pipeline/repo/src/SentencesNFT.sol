// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract SentencesNFT is
    ERC721Enumerable,
    Pausable,
    ERC721URIStorage,
    ERC721Burnable
{
    uint256 public _tokenIds;
    address private _owner;

    uint256 public MAX_NFTS_PER_ADDRESS = 5;

    mapping(address => uint256) public _nftCount;
    mapping(uint256 => bytes) public _tokenSentence;

    event SentenceNFTFTMinted(
        address indexed _from,
        address indexed _to,
        uint256 _tokenId,
        string _tokenUri
    );
    event MAXNFTsUpdated(uint256 _from, uint256 _to);

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownership Assertion: Caller of the function is not the owner.");
        _;
    }
    constructor(address _contractOwner) ERC721("SentencesNFT", "SNFT") {
        _owner = _contractOwner;
        emit MAXNFTsUpdated(0, MAX_NFTS_PER_ADDRESS);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setMaxPerAddress(uint256 newMax) external onlyOwner {
        uint256 oldMax = MAX_NFTS_PER_ADDRESS;
        MAX_NFTS_PER_ADDRESS = newMax;
        emit MAXNFTsUpdated(oldMax, MAX_NFTS_PER_ADDRESS);
    }

    function mint(address to, string memory sentence) public returns (uint256) {
        require(
            _nftCount[to] < MAX_NFTS_PER_ADDRESS,
            "SentencesNFT: maximum NFTs per address reached"
        );

        require(bytes(sentence).length > 0, "Must provide a sentence");
        
        _tokenIds++;

        uint256 newTokenId = _tokenIds;
        _safeMint(to, newTokenId);

        _tokenSentence[newTokenId] = bytes(sentence);

        emit SentenceNFTFTMinted(
            address(0),
            to,
            newTokenId,
            tokenURI(newTokenId)
        );
        return newTokenId;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        if (to == address(0)) { // burning
            _nftCount[from] -= 1;
        } else if (from == address(0)) { // minting
            _nftCount[to] += 1;
        } else { // transferring
            _nftCount[from] -= 1;
            _nftCount[to] += 1;
        }
    }

    function balanceOf(
        address owner
    ) public view virtual override(ERC721, IERC721) returns (uint256) {
        return _nftCount[owner];
    }

    // The following functions are overrides required by Solidity.
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function burnAdminOnly(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Sentence NFT", "description": "", "attributes":[ { "trait_type": "sentence", "value": "',
                        _tokenSentence[tokenId],
                        '"}]}'
                    )
                )
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
