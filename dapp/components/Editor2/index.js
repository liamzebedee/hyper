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
// import * as IPFS from 'ipfs-core'
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

    return new Promise((resolve, reject) => {
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
        img.src = url;
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


const Editor = observer(() => {
    const [editorState] = useState(() => new EditorState())

    useEffect(async () => {
        const ipfs = await IPFSHttp.create(IPFS_NODE_URI)
        const cid = 'QmVF3t1mJLGSY8UdVVtDx112gU4sp1yNAxwUmACaD1Mpes'
        const data = uint8ArrayConcat(await all(ipfs.cat(cid)))
        const content = JSON.parse(new TextDecoder().decode(data))

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

    const [stars, setStars] = useState(generateShapes());


    
    function generateShapes() {
        return [...Array(10)].map((_, i) => ({
            id: i.toString(),
            x: Math.random() * 400,
            y: Math.random() * 700,
            rotation: Math.random() * 180,
            isDragging: false,
        }));
    }


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
        
        function convertImage(child) {

        }

        const children = allChildren
            .filter(child => acceptedTypes.includes(child.className));
        
        // Now convert each node.
        const objects = children.map(node => {
            let obj = {
                type: null
            }
            
            const data = _.pick(node, ['attrs', 'colorKey'])

            // Determine obj.type.
            if(node.className == 'Image') {
                const type = 'image'
                const url = node.attrs.image.src

                obj = {
                    ...data,
                    type,
                    url
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
        })

        const file = {
            version: '0.0.1',
            objects
        }


        const ipfs = await IPFSHttp.create(IPFS_NODE_URI)
        const { cid } = await ipfs.add(JSON.stringify(file))

        console.log('exportCanvasAsHyper', children, objects);
        console.log(`${IPFS_GATEWAY_BASE_URI}${cid.toString()}`)
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

                    {/* {stars.map((star) => (
                        <Star
                            key={star.id}
                            id={star.id}
                            x={star.x}
                            y={star.y}
                            numPoints={5}
                            innerRadius={20}
                            outerRadius={40}
                            fill="#89b717"
                            opacity={0.8}
                            draggable
                            rotation={star.rotation}
                            shadowColor="black"
                            shadowBlur={10}
                            shadowOpacity={0.6}
                            shadowOffsetX={star.isDragging ? 10 : 5}
                            shadowOffsetY={star.isDragging ? 10 : 5}
                            scaleX={star.isDragging ? 1.2 : 1}
                            scaleY={star.isDragging ? 1.2 : 1}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        />
                    ))} */}

                </Layer>
            </Stage>
        </div>
    </div>
})


export default Editor