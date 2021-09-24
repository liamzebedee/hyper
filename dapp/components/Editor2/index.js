import React, { createRef, useEffect, useReducer, useRef, useState } from 'react';

// const { Stage, Layer, Star, Text } = require('react-konva');
import("konva")
// const { Stage, Layer, Star, Text } = import('react-konva');
const { Layer, Star, Text, Image, Rect, Transformer } = require('react-konva');
import { Stage } from './Stage'
import useImage from 'use-image'
import { makeObservable, observable, action, computed } from "mobx"
import { observer } from 'mobx-react-lite'
import styles from './styles.module.css'
import cuid from 'cuid';
import _, { create } from 'lodash'
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const all = require('it-all')
const dataUriToBuffer = require('data-uri-to-buffer');

const IPFSHttp = require('ipfs-http-client')
const IPFS_NODE_URI = 'http://0.0.0.0:5001/'
const IPFS_GATEWAY_BASE_URI = 'http://0.0.0.0:8080/ipfs/'
const IMAGE_URI_SVG = "https://storage.opensea.io/files/7027a367a2d7923c6b86845d4be3a143.svg"
const IMAGE_URI = "https://upload.wikimedia.org/wikipedia/en/c/cc/Wojak_cropped.jpg"


function downloadURI(uri, name) {
    var link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
            const buf = await loadIpfsFile(cid, 'binary')
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
            addObject: action
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

    async addObject(obj) {
        let editorObject = await this.loadObject(obj)
        this.objects.push(editorObject)
    }
};

let refs = {}
const CID = require('cids')

function normaliseCID(cid) {
    return cid.asCID.toV1().toString()
}

async function loadIpfsFile(cid, format='json') {
    const convertedCID = (new CID(cid)).toV1().toString('base32')

    const ipfs = await IPFSHttp.create(IPFS_NODE_URI)
    const data = uint8ArrayConcat(await all(ipfs.cat(convertedCID)))
    let content
    if (format == 'json') {
        content = JSON.parse(new TextDecoder().decode(data))
    } else if(format == 'binary') {
        content = data
    }
    return content
}

const Editor = observer(() => {
    const [editorState] = useState(() => new EditorState())

    useEffect(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const cid = urlParams.get('cid');
        
        let content = {
            objects: []
        }
        if(cid) {
            content = await loadIpfsFile(cid, 'json')
        }

        console.log(content)

        editorState.initialize({
            objects: content.objects
        })

        // editorState.initialize({
        //     objects: [
        //         {
        //             type: 'image',
        //             url: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Wojak_cropped.jpg'
        //         }
        //     ]
        // })
    }, [])

    const handleDragStart = (e) => {
        const id = e.target.id();
        setStars(
            stars.map((star) => {
                return {
                    ...star,
                    isDragging: star.id === id,
                };
            })
        );
    };
    const handleDragEnd = (e) => {
        setStars(
            stars.map((star) => {
                return {
                    ...star,
                    isDragging: false,
                };
            })
        );
    };
    

    const [image] = useImage(IMAGE_URI, 'anonymous');
    
    const stageRef = useRef()

    function exportCanvas() {
        const uri = stageRef.current.toDataURL();
        console.log('exportCanvas', uri);

        downloadURI(uri, 'meme.jpg')

        // we also can save uri as file
        // but in the demo on Konva website it will not work
        // because of iframe restrictions
        // but feel free to use it in your apps:
        // downloadURI(uri, 'stage.png');
    }

    async function exportCanvasAsHyper() {
        const stage = stageRef.current;
        const layer = stage.getChildren()[0]
        const allChildren = layer.getChildren()

        const acceptedTypes = ['Image', 'Rect']

        const children = allChildren
            .filter(child => acceptedTypes.includes(child.className));

        const ipfs = await IPFSHttp.create(IPFS_NODE_URI)

        // Now convert each node.
        const objects = await Promise.all(children.map(async node => {
            let obj = {
                type: null
            }
            
            const data = _.pick(node, ['attrs', 'colorKey'])

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
                    // extract image type
                    // const urlObj = new URL(url)
                    // new URL("data:image/jpeg;base64,/9j/4AAQSk")
                    // pathname: "image/jpeg;base64,/9j/4AAQSk",
                    // image.imageType = urlObj.pathname.split(';')[0]
                    

                    // upload to ipfs
                    const buf = dataUriToBuffer($image.src)
                    const { cid } = await ipfs.add(buf)
                    console.log(cid)
                    const ipfsUri = `ipfs://${normaliseCID(cid)}`
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

        const file = {
            version: '0.0.1',
            objects
        }

        const { cid } = await ipfs.add(JSON.stringify(file))

        console.log('exportCanvasAsHyper', children, objects);
        console.log(`${IPFS_GATEWAY_BASE_URI}${normaliseCID(cid)}`)
        window.open(`http://localhost:3001?cid=${normaliseCID(cid)}`)
    }


    // const refs = editorState.objects.map(({ id }) => {
    //     return { [id]: createRef() }
    // }).reduce((acc,curr) => Object.assign(acc, curr), {})

    console.log('refs', refs)

    const objects = editorState.objects.map((object) => {
        if (object.type === 'image') {
            const { img } = object

            let ref = _.get(refs, object.id)
            if(!ref) {
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
        }
    })

    console.log('selected', editorState.selected)

    const transformerRef = useRef()

    useEffect(() => {
        const selected = editorState.selected.map(id => refs[id])
        console.log(`updateTransformer`, selected)

        transformerRef.current.nodes(selected.map(ref => ref.current));
        transformerRef.current.getLayer().batchDraw();
    })
    console.log(editorState.dragActive)

    return <div 
        onDrop={(ev) => {
            ev.preventDefault()
        }}
        onDragOver={(ev) => {
            // Prevent default browser behaviour.
            ev.preventDefault()
        }}>

        <h3>hyper editor</h3>
        <button onClick={exportCanvas}>Export (.png)</button>
        <button onClick={exportCanvasAsHyper}>Export (.hyper)</button>

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
            onDrop={(ev) => {
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
                        reader.addEventListener('load', () => {
                            console.log(reader.result)
                            editorState.addObject({
                                type: 'image',
                                url: reader.result,
                                position: stageRef.current.getPointerPosition()
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
            style={{
                border: `2px solid ${editorState.dragActive == true ? 'blue' : 'black'}`
            }}>
            <Stage ref={stageRef} width={700} height={700}>
                <Layer onClick={() => {
                    editorState.select([])
                }}>
                    <Rect x={0} y={0} width={700} height={700} fill="white">
                    </Rect>                    
                    
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