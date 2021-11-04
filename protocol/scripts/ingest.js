const hre = require("hardhat")
const { getContracts } = require('..')

async function main() {
    const network = hre.network.name
    console.log(`contracts on ${network}`)

    const signer = await hre.ethers.getSigner()
    const { HyperMedia } = getContracts({
        network: 'kovan', 
        signerOrProvider: signer
    })

    const tx = await HyperMedia.create([], ["bafybeibqcttzdeznkrtdn3byco4tvwqxt52wm2cftz2bgumr6muybz2tz2"], "bafybeibqcttzdeznkrtdn3byco4tvwqxt52wm2cftz2bgumr6muybz2tz2", "bafybeibqcttzdeznkrtdn3byco4tvwqxt52wm2cftz2bgumr6muybz2tz2")
    await tx.wait(1)
    console.log('done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


