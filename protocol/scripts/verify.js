const hre = require("hardhat")

// async function getConstructorArguments(contractInstance) {
//     // Get the transaction that created the contract with its resulting bytecode.
//     result = await axios.get(etherscanUrl, {
//         params: {
//             module: 'account',
//             action: 'txlist',
//             address,
//             sort: 'asc',
//             apikey: process.env.ETHERSCAN_KEY,
//         },
//     });

//     if (!+result.data.status) {
//         console.log(
//             red(` - Unable to verify ${name} - Etherscan returned "${result.data.result}"`)
//         );
//         tableData.push([
//             name,
//             address,
//             `Unable to verify, Etherscan returned "${result.data.result}`,
//         ]);
//     }

//     // Get the bytecode that was in that transaction.
//     const deployedBytecode = result.data.result[0].input;

//     // add the transaction and timestamp to the json file
//     deployment.targets[name].txn = `${explorerLinkPrefix}/tx/${result.data.result[0].hash}`;
//     deployment.targets[name].timestamp = new Date(result.data.result[0].timeStamp * 1000);

//     fs.writeFileSync(deploymentFile, stringify(deployment));

//     // Grab the last 150 characters of the compiled bytecode
//     const compiledBytecode = deployment.sources[source].bytecode.slice(-150);

//     const pattern = new RegExp(`${compiledBytecode}(.*)$`);
//     if (!pattern.test(deployedBytecode)) {
//         console.log(red(` - Unable to verify ${name} (deployed bytecode doesn't match local)`));
//         tableData.push([name, address, 'Deployed bytecode doesnt match local']);
//         continue;
//     }
//     const constructorArguments = pattern.exec(deployedBytecode)[1];
// }

function decodeConstructorArgs({ deployedBytecode, bytecode }) {
    // Get the bytecode that was in that transaction.
    // const deployedBytecode = result.data.result[0].input;

    // Grab the last 150 characters of the compiled bytecode
    // const compiledBytecode = deployment.sources[source].bytecode.slice(-150);
    const compiledBytecode = bytecode.slice(-150);

    const pattern = new RegExp(`${compiledBytecode}(.*)$`);
    if (!pattern.test(deployedBytecode)) {
        console.log(red(` - Unable to verify (deployed bytecode doesn't match local)`));
    }
    const constructorArguments = pattern.exec(deployedBytecode)[1];
    return constructorArguments
}

async function main() {
    const network = hre.network.name
    console.log(`Verifying contracts on ${network}`)
    const deployments = require(`../../deployments/${network}.json`)

    const { targets } = deployments
    for(const [targetName, target] of Object.entries(targets)) {
        const constructorArguments = decodeConstructorArgs({
            deployedBytecode: target.deployTransaction.data,
            bytecode: target.bytecode
        })
        
        await hre.run("verify:verify", {
            address: target.address,
            constructorArguments: []
        });
    }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
