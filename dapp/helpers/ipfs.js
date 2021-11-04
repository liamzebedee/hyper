import { IPFS_NODE_URI } from '../config'

const CID = require('cids')
const IPFSHttp = require('ipfs-http-client')

const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const all = require('it-all')

export function normaliseCID(cid) {
    return cid.asCID.toV1().toString()
}

let _ipfs
async function getIpfs() {
    if (!_ipfs) {
        _ipfs = await IPFSHttp.create(IPFS_NODE_URI)
    }
    return _ipfs
}

export async function downloadFromIpfs(cid, format = 'json') {
    const convertedCID = (new CID(cid)).toV1().toString('base32')

    const ipfs = await getIpfs()
    const data = uint8ArrayConcat(await all(ipfs.cat(convertedCID)))
    let content
    if (format == 'json') {
        content = JSON.parse(new TextDecoder().decode(data))
    } else if (format == 'binary') {
        content = data
    }
    return content
}

export async function uploadToIpfs(bufferOrString) {
    const ipfs = await getIpfs()
    const { cid } = await ipfs.add(bufferOrString)
    console.log(cid)
    const ipfsUri = `ipfs:${normaliseCID(cid)}`
    return { ipfsUri, _cid: cid, cid: normaliseCID(cid) }
}

export function getCIDFromIPFSUrl(urlString) {
    return urlString.split('ipfs:')[1]
}