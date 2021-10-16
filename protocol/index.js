const ethers = require('ethers')

const networks = [
    'mainnet',
    'hardhat'
]

function getContracts({ network = 'mainnet', signerOrProvider }) {
    const deployFile = require('../deployments/' + network + '.json')

    return Object
        .entries(deployFile.targets)
        .map(([target, contract]) => {
            return {
                [target]: new ethers.Contract(
                    contract.address,
                    contract.abi,
                    signerOrProvider
                )
            }
        })
        .reduce((prev, curr) => Object.assign(prev, curr), {})
}

module.exports = {
    networks,
    getContracts
}