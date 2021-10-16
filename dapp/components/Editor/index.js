import React, { createRef, useEffect, useReducer, useRef, useState } from 'react';
const { Layer, Star, Text, Image, Rect, Transformer } = require('react-konva');
import { makeObservable, observable, action, computed } from "mobx"
import { observer } from 'mobx-react-lite'
import cuid from 'cuid';
import _, { create } from 'lodash'
const dataUriToBuffer = require('data-uri-to-buffer');
const ethers = require('ethers')
import ENS, { getEnsAddress } from '@ensdomains/ensjs'

import { downloadURI, normaliseCID, downloadFromIpfs, uploadToIpfs } from '../../helpers'
import { IPFS_GATEWAY_BASE_URI, IPFS_NODE_URI } from '../../config';
import { Stage } from './Stage'
import EditableText from '../EditableText/EditableText'
import styles from './styles.module.css'

const web3Modal = new Web3Modal({
    network: "mainnet", // optional
    cacheProvider: true, // optional
    providerOptions: {} // required
});

let provider
let ens

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
            const cid = urlObj.hostname
            console.log(cid)
            const buf = await downloadFromIpfs(cid, 'binary')
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


class EditorState {
    objects = []
    selected = []

    dragActive = false

    constructor(title) {
        makeObservable(this, {
            objects: observable,
            initialize: action,
            selected: observable,
            select: action,
            dragActive: observable,
            setDragActive: action,
            addObject: action,
            delete: action
        })
    }

    async initialize({ objects }) {
        this.objects = await Promise.all(objects.map(obj => this.loadObject(obj)))
    }

    async loadObject(obj) {
        let editorObject = {
            ...obj
        }

        if (obj.type == 'image') {
            editorObject = await this.loadImageObject(obj)
        }

        editorObject.id = cuid()
        return editorObject
    }

    async loadImageObject(obj) {
        const img = await getImageElement(obj.url, true)
        return {
            ...obj,
            img
        }
    }

    select(objects) {
        this.selected = objects
    }

    setDragActive(v) {
        this.dragActive = v
    }
    
    delete(objectIds) {
        this.objects = this.objects.filter(obj => !objectIds.includes(obj.id))
        this.selected = this.selected.filter(id => this.objects.includes(id))
    }

    async addObject(obj) {
        let editorObject = await this.loadObject(obj)
        this.objects.push(editorObject)
    }
};

class Web3State {
    provider = null
    signer = null
    ensName = null

    constructor(title) {
        makeObservable(this, {
            provider: observable,
            ensName: observable,
            signer: observable,
            set: action
        })
    }

    set(provider, signer, ensName) {
        this.provider = provider
        this.signer = signer
        this.ensName = ensName
    }
};

let refs = {}



import Web3Modal from "web3modal";
const providerOptions = {};




const Editor = observer(() => {
    const [editorState] = useState(() => new EditorState())
    const [web3State] = useState(() => new Web3State())


    useEffect(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const cid = urlParams.get('cid');
        
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
            content = await downloadFromIpfs(cid, 'json')
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

    async function exportCanvasAsHyper() {
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
            if(node.className == 'Image') {
                let image = {
                    type: 'image',
                    url: null,
                }
                const $image = node.attrs.image
                console.log($image)
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
        console.log('rasterImageIpfsCid', rasterImageIpfsCid)
        
        const { cid: sourceCid } = await uploadToIpfs(JSON.stringify(file))

        console.log('exportCanvasAsHyper', children, objects);
        console.log(`${IPFS_GATEWAY_BASE_URI}${normaliseCID(sourceCid)}`)

        const hyper = require('../../../protocol')
        const { HyperMedia } = hyper.getContracts({
            network: 'hardhat',
            signerOrProvider: web3State.signer
        })
        
        // Find all sources.
        const sources = (await Promise.all(
            objects
                .map(async obj => {
                    if(!obj.url) return null

                    let url = new URL(obj.url)
                    if(url.protocol != 'ipfs:') return null
                    let cid = url.pathname

                    // Now query provenance of this media item.
                    const tokenId = await HyperMedia.cidToToken(cid)
                    // If the token id is 0 (special case - unset), then there is no
                    // ownership of this content.
                    if(tokenId.isZero()) return null

                    return tokenId
                })
        )).filter(x => x != null)

        console.log('sources', sources)

        const tx = await HyperMedia.create(
            sources,
            rasterImageIpfsCid,
            sourceCid
        )
        await tx.wait(1)
        console.log(tokenId)


        window.open(`http://localhost:3001?cid=${normaliseCID(sourceCid)}`)
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
            rawProvider = window.ethereum
        }

        provider = new ethers.providers.Web3Provider(rawProvider)
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
        <button onClick={exportCanvasAsHyper}>Publish</button>

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


export default Editor