
export const IPFS_NODE_URI = 'http://0.0.0.0:5001/'

export const IPFS_GATEWAY_BASE_URI = 'http://0.0.0.0:8080/ipfs/'

// lol
export const WOJAK_IMAGE_URI = "https://upload.wikimedia.org/wikipedia/en/c/cc/Wojak_cropped.jpg"



// Templates.
export const MEME_TEMPLATES = `
2 - Sad Wojak - WAaw
`.split('\n').filter(x => !!x).map(line => line.split(' - ').map(([tokenId, title, description]) => ({ tokenId, title, description })))