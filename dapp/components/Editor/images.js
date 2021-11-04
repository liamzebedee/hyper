
import { IPFS_GATEWAY_BASE_URI } from '../../config';
import { getCIDFromIPFSUrl } from '../../helpers'

let images = {}

async function getImageElement(url, crossOrigin) {
    if (!url) return;

    var img = document.createElement('img');

    return new Promise(async (resolve, reject) => {
        function onload() {
            resolve(img)
        }

        function onerror(err) {
            reject(err)
        }

        img.addEventListener('load', onload);
        img.addEventListener('error', onerror);
        if (crossOrigin) {
            img.crossOrigin = crossOrigin
        }

        const urlObj = new URL(url)

        if (urlObj.protocol === 'ipfs:') {
            const cid = getCIDFromIPFSUrl(url)
            console.log(cid)
            // const buf = await downloadFromIpfs(cid, 'binary')
            img.src = `${IPFS_GATEWAY_BASE_URI}${cid}`
            img['data-ipfs'] = url
        } else {
            img.src = url;
        }
        console.log(img)
        // return function cleanup() {
        //     img.removeEventListener('load', onload);
        //     img.removeEventListener('error', onerror);
        //     setState(defaultState);
        // };
    })
}

export {
    images,
    getImageElement
}