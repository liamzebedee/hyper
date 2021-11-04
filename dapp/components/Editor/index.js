import React, { createRef, useCallback, useEffect, useReducer, useRef, useState } from 'react';
const { Layer, Star, Text, Image, Rect, Transformer } = require('react-konva');
import { makeObservable, observable, action, computed } from "mobx"
import { observer } from 'mobx-react-lite'
import _, { create } from 'lodash'
const dataUriToBuffer = require('data-uri-to-buffer');
const ethers = require('ethers')
import ENS, { getEnsAddress } from '@ensdomains/ensjs'

import { downloadURI, normaliseCID, downloadFromIpfs, uploadToIpfs, getCIDFromIPFSUrl } from '../../helpers'
import { IPFS_GATEWAY_BASE_URI, IPFS_NODE_URI } from '../../config';
import { Stage } from './Stage'
import EditableText from '../EditableText/EditableText'
import styles from './styles.module.css'

const web3Modal = new Web3Modal({
    network: "mainnet", // optional
    cacheProvider: true, // optional
    providerOptions: {} // required
});

const NETWORK = 'kovan'

const { images, getImageElement } = require('./images')
const { EditorState, Web3State } = require('./state')

let refs = {}



import Web3Modal from "web3modal";
const providerOptions = {};


const hyper = require('../../../protocol')
class HyperLibrary {
    constructor() {}
    static create(provider, network) {
        let self = new HyperLibrary()
        self.contracts = hyper.getContracts({
            network: NETWORK,
            signerOrProvider: provider
        })
        return self
    }

    async get(tokenId, fetchSources=true) {
        const { HyperMedia } = this.contracts

        const tokenURI = await HyperMedia.tokenURI(tokenId)
        console.log(tokenId, tokenURI)
        const [, creator] = await HyperMedia.media(tokenId)
        const sourcesIDs = await HyperMedia.getSources(tokenId)
        let sources = []
        if (fetchSources) {
            sources = await Promise.all(sourcesIDs.map(id => {
                return this.get(id, false)
            }))
        }

        const erc721MetadataURI = dataUriToBuffer(tokenURI).toString()
        const erc721Metadata = JSON.parse(erc721MetadataURI)

        console.log('metadata', erc721Metadata)

        if (!erc721Metadata.source) throw new Error("invalid format")

        const sourceUrl = new URL(erc721Metadata.source)
        if (sourceUrl.protocol != 'ipfs:') throw new Error("invalid protocol")
        const sourceCID = getCIDFromIPFSUrl(erc721Metadata.source)
        console.log(sourceCID)
        let source
        try {
            source = await downloadFromIpfs(getCIDFromIPFSUrl(erc721Metadata.source), 'json')
        } catch(ex) {
            if(fetchSources) throw ex
        }
        
        return {
            tokenId,
            source,
            creator,
            erc721Metadata,
            sources,
        }
    }
}

async function exportCanvasAsHyper(forkedObjectId, stageRef, web3State) {
    const stage = stageRef.current;
    const layer = stage.getChildren()[0]
    const allChildren = layer.getChildren()

    const acceptedTypes = ['Image', 'Rect', 'Text']

    const children = allChildren
        .filter(child => acceptedTypes.includes(child.className));

    // Now convert each node.
    const objects = await Promise.all(children.map(async node => {
        let obj = {
            type: null
        }

        const KONVA_KEYS = ['attrs', 'colorKey']
        const data = _.pick(node, KONVA_KEYS)

        // Determine obj.type.
        if (node.className == 'Image') {
            let image = {
                type: 'image',
                url: null,
            }
            // Error: $image is undefined ??
            let $image = node.getImage()
            if ($image["data-ipfs"]) {
                // If the content is originating from IPFS, we don't re-upload it.
                // This is a bit of a hack, as we assume that the <img> element will have the 
                // data-ipfs property, set above.
                image.url = $image["data-ipfs"]
            } else if ($image.src.startsWith('data')) {
                // Image was drag-n-dropped locally.
                // Now we upload it to IPFS.
                const buf = dataUriToBuffer($image.src)
                const { ipfsUri } = await uploadToIpfs(buf)
                console.log(`uploaded submedia ${ipfsUri}`)
                image.url = ipfsUri
            }

            obj = {
                ...data,
                ...image
            }

            delete obj.attrs.image

        } else {
            const type = node.className

            obj = {
                ...data,
                type,
            }
        }

        return obj
    }))

    // A .hyper file is an ERC721 metadata format. 
    const file = {
        version: '0.0.1',
        image: "",
        objects
    }

    // Export PNG to IPFS, for use in ERC721 metadata.
    const rasterImageUri = stageRef.current.toDataURL();
    const rasterImageBuf = dataUriToBuffer(rasterImageUri)
    const { ipfsUri: rasterImageIpfsUri, cid: rasterImageIpfsCid } = await uploadToIpfs(rasterImageBuf)

    console.log('file', file)
    console.log('rasterImageIpfsUri', rasterImageIpfsUri)
    console.log(`${IPFS_GATEWAY_BASE_URI}${rasterImageIpfsCid}`)

    const { cid: sourceCid } = await uploadToIpfs(JSON.stringify(file))

    console.log('exportCanvasAsHyper', children, objects);
    console.log(`${IPFS_GATEWAY_BASE_URI}${sourceCid}`)

    const hyper = require('../../../protocol')
    const { HyperMedia } = hyper.getContracts({
        network: NETWORK,
        signerOrProvider: web3State.signer
    })

    // Find all sources.
    console.log('objects', objects)
    const existingSources = []
    const newSources = []
    
    // By convention, the first of the existing sources is the 
    // original forked canvas.
    if (forkedObjectId) existingSources.push(forkedObjectId)

    await Promise.all(
        objects
            .map(async obj => {
                if (!obj.url) return null
                const url = new URL(obj.url)
                if (url.protocol != 'ipfs:') return null

                let cid = getCIDFromIPFSUrl(obj.url)

                // Now query provenance of this media item.
                const tokenId = await HyperMedia.cidToToken(cid)
                // If the token id is 0 (special case - unset), then there is no
                // ownership of this content.
                if (tokenId.isZero()) {
                    console.log(cid)
                    newSources.push(cid)
                } else {
                    existingSources.push(tokenId.toString())
                }
            })
    )

    console.log('existingSources', existingSources)
    console.log('newSources', newSources)

    console.log('HyperMedia', rasterImageIpfsCid, sourceCid)
    
    console.log(
        `HyperMedia.create`,
        existingSources,
        newSources,
        rasterImageIpfsCid,
        sourceCid
    )

    const tx = await HyperMedia.create(
        existingSources,
        newSources,
        rasterImageIpfsCid,
        sourceCid
    )
    const receipt = await tx.wait(1)

    const tokenId = await HyperMedia.cidToToken(sourceCid)
    console.log(receipt)
    console.log(tokenId)


    window.open(`http://localhost:3001?cid=${sourceCid}`)
    window.open(`http://localhost:3001?token=${tokenId.toString()}`)
}

const Editor = observer(() => {
    const [editorState] = useState(() => new EditorState())
    const [web3State] = useState(() => new Web3State())

    const [objectDetails, setObjectDetails] = useState({
        author: null,
        createdAt: null
    })

    useEffect(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const cid = urlParams.get('cid');
        const tokenId = urlParams.get('token');
        
        let content = {
            objects: [
                // Default white background.
                /*
                <Rect x={0} y={0} width={700} height={700} fill="white">
                </Rect>
                */
                {
                    type: 'Rect',
                    attrs: {
                        x: 0,
                        y: 0,
                        width: 700,
                        height: 700,
                        fill: "white"
                    }
                }
            ]
        }

        if(cid) {
            // DEV-ONLY
            content = await downloadFromIpfs(cid, 'json')
        }
        if(tokenId) {
            let fallbackProvider
            if (NETWORK == 'hardhat') {
                fallbackProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
            } else {
                fallbackProvider = new ethers.providers.JsonRpcProvider('https://kovan.infura.io/v3/feb228261711453d992038ab7aebefe3')
            }

            let hyperLibrary = await HyperLibrary.create(fallbackProvider, 'kovan')
            const object = await hyperLibrary.get(tokenId)
            setObjectDetails(object)
            content = object.source
        }

        console.log(content)

        editorState.initialize({
            objects: content.objects
        })
    }, [])
    
    const stageRef = useRef()

    function exportCanvas() {
        const uri = stageRef.current.toDataURL();
        console.log('exportCanvas', uri);

        downloadURI(uri, 'meme.jpg')
    }    

    console.log('refs', refs)

    const transformerRef = useRef()

    const objects = editorState.objects.map((object) => {
        if (object.type === 'image') {
            const { img } = object

            let ref = _.get(refs, object.id)
            if (!ref) {
                ref = createRef()
                refs[object.id] = ref
            }

            return <Image
                key={object.id}
                ref={ref}
                crossOrigin
                image={img}
                draggable
                onClick={(ev) => {
                    console.log('select', object.id)
                    editorState.select([object.id])
                    ev.cancelBubble = true
                }} 
                {...object.attrs}
                />
        } else if(object.type == 'Rect') {
            return <Rect
                key={object.id}
                draggable
                {...object.attrs} />
        } else if (object.type == 'Text') {

            let ref = _.get(refs, object.id)
            if (!ref) {
                ref = createRef()
                refs[object.id] = ref
            }

            return <EditableText
                key={object.id}
                ref={ref}
                onClick={(ev) => {
                    console.log('select', object.id)
                    editorState.select([object.id])
                    ev.cancelBubble = true
                }}
                draggable
                stageRef={stageRef}
                transformerRef={transformerRef}
                {...object.attrs} />
        }
    })


    console.log('selected', editorState.selected)
    useEffect(() => {
        const selected = editorState.selected.map(id => refs[id])
        console.log(`transformer.nodes`, selected)

        transformerRef.current.nodes(selected.map(ref => ref.current));
        transformerRef.current.getLayer().batchDraw();
    }, [editorState.selected])

    async function connectWallet() {
        let rawProvider
        if(process.env.NODE_ENV == 'production') {
            rawProvider = await web3Modal.connect();
        } else {
            await window.ethereum.enable()
            // const accounts = await window.ethereum.send('eth_requestAccounts');
            rawProvider = window.ethereum
        }

        const provider = new ethers.providers.Web3Provider(rawProvider)
        const signer = await provider.getSigner()
        const addy = await signer.getAddress()
        
        let ensName
        if (process.env.NODE_ENV == 'production') {
            const ens = new ENS({ 
                provider: cloudflareProvider,
                ensAddress: getEnsAddress('1') 
            })
            let { name: ensName } = await ens.getName(addy)
            console.log(addy, ensName)

            if (addy != (await ens.name(ensName).getAddress())) {
                ensName = addy
            }
        } else {
            ensName = addy
        }

        web3State.set(provider, signer, ensName)
    }

    return <div 
        onDrop={(ev) => {
            ev.preventDefault()
        }}
        onDragOver={(ev) => {
            // Prevent default browser behaviour.
            ev.preventDefault()
        }}>

        <h3>HYPER FABRICATOR</h3>
        <p>
        {
            web3State.provider 
            ? web3State.ensName
            : <button onClick={connectWallet}>Connect wallet</button>
        }
        </p>

        <div>

            <button onClick={() => {
                editorState.addObject({
                    type: 'Text',
                    attrs: {
                        x: 50,
                        y: 50,
                        fontSize: 20,
                        width: 200,
                        fontFamily: 'sans-serif',
                        text: 'LOL WUT'
                    }
                })
            }}>
                <img width={64} height={64} src="/icons/text.svg"/>
            </button>
            
            <button>
                <img width={64} height={64} src="/icons/image.svg" />
            </button>

            <button onClick={exportCanvas}>Export (.png)</button>
            <button onClick={() => exportCanvasAsHyper(objectDetails && objectDetails.tokenId, stageRef, web3State)}>Publish</button>
        </div>
        
        <div>
            {objectDetails.tokenId
                ? <MetadataInfo objectDetails={objectDetails}/> 
                : null
            }
        </div>

        <div className={styles.canvas}
            onDragEnter={(ev) => {
                ev.preventDefault()
                editorState.setDragActive(true)
            }}
            onDragLeave={(ev) => {
                editorState.setDragActive(false)
                ev.preventDefault()
            }}
            onDragOver={(ev) => {
                // Prevent default browser behaviour.
                editorState.setDragActive(true)
                ev.preventDefault()
            }}
            onDrop={async (ev) => {
                ev.preventDefault()
                editorState.setDragActive(false)

                // now we need to find pointer position
                // we can't use stage.getPointerPosition() here, because that event
                // is not registered by Konva.Stage
                // we can register it manually:
                stageRef.current.setPointersPositions(ev);
                console.log(ev.dataTransfer)

                for (let item of ev.dataTransfer.items) {
                    if (item.type == 'image/png' || item.type == 'image/jpeg') {
                        const reader = new FileReader();
                        reader.addEventListener('load', async () => {
                            console.log(reader.result)

                            // Scale down image if it is bigger than stage.
                            const canvas = {
                                width: stageRef.current.width(),
                                height: stageRef.current.height()
                            }
                            console.log(canvas)
                            const img = await getImageElement(reader.result)
                            
                            const padding = 69 // lel
                            var hRatio = (canvas.width - padding) / img.width;
                            var vRatio = (canvas.height - padding) / img.height;
                            var ratio = Math.min(hRatio, vRatio)

                            editorState.addObject({
                                type: 'image',
                                url: reader.result,
                                
                                attrs: {
                                    width: img.width * ratio, 
                                    height: img.height * ratio,
                                    position: {
                                        x: padding / 2,
                                        y: padding / 2
                                    }
                                }
                            })
                        }, false)
                        reader.readAsDataURL(item.getAsFile())
                    }
                }

            }}
            onDragEnd={(ev) => {
                ev.preventDefault()
                editorState.setDragActive(false)
            }}

            // You should use tabIndex attribute to be able to listen onKeyDown event on a div in React. Setting tabIndex="0" should fire your handler.
            // LOL, HTML/DOM.
            // https://stackoverflow.com/a/44434971
            tabIndex={-1}
            onKeyUp={(ev) => {
                console.log(ev)
                ev.preventDefault()
                if (ev.key == 'Backspace') {
                    // delete current selection.
                    console.log('Del')
                    editorState.delete(editorState.selected)
                }
            }}
            style={{
                border: `2px solid ${editorState.dragActive == true ? 'blue' : 'black'}`
            }}>
            <Stage ref={stageRef} width={700} height={700} 
                onClick={() => editorState.select([])}>
                <Layer onClick={() => {
                    editorState.select([])
                }}>                    
                    {objects}

                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            // limit resize
                            if (newBox.width < 5 || newBox.height < 5) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                    />

                </Layer>
            </Stage>
        </div>
    </div>
})

const MetadataInfo = ({ objectDetails }) => {
    console.log(objectDetails)
    const { creator, tokenId, sources } = objectDetails
    
    let remixDetails
    if(sources.length) {
        let og = sources[0]
        let tokenId = og.tokenId.toString()

        const cid = getCIDFromIPFSUrl(og.erc721Metadata.image)
        console.log(cid)
        let src = `${IPFS_GATEWAY_BASE_URI}${cid}`

        remixDetails = <>
            <p>remix of <a href={`/?token=${tokenId}`}>#{tokenId}</a> by {og.creator}</p>
            <img src={src} width={64} height={64}/>
        </>
    }

    return <div>
        <p>created by {creator}</p>
        {remixDetails}

    </div>
}


export default Editor