import React, { useEffect, useRef, useState } from "react"
import styles from './styles.module.css'

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return { x, y }
}


export const Editor = () => {
    const canvas = useRef()

    const [state, setState] = useState({
        objects: [
            <Object id={1} position={[0,0]}>
                <Textbox />
            </Object>,
        ]
    })
    const [selection, setSelection] = useState([])
    const [objects, setObjects] = useState([])

    function handleOnClick(ev) {
        const { x, y } = getCursorPosition(canvas.current, ev)
        console.log(`click ${x} ${y}`)

        // if(state.currentSelection != null) {

        // }
        
        // setState({
        //     textbox: {
        //         x, y
        //     }
        // })
    }

    useEffect(() => {
        setObjects([
            
        ])
    }, [])

    return <div>
        <div>
        </div>

        <div>
            <div className={styles.canvasContainer}>
                {/* {state.objects} */}

                <svg width={500} height={500} className={styles.canvas}>
                    {objects}
                </svg>
            </div>

        </div>
    </div>
    
}

// const GenericObject = ({ }) => {

// }

const ImageObject = ({ url }) => {
    return <g>
        <image href="https://storage.opensea.io/files/7027a367a2d7923c6b86845d4be3a143.svg" height="200" width="200" />
    </g>
}

// cursor

const Object = ({ position, children }) => {
    const [x,y] = position
    return <div style={{ left: x, top: y }} className={styles.object}>
        {children}
    </div>
}

const Textbox = ({ position }) => {
    const [editable, setEditable] = useState(false)
    const [value, setValue] = useState("")
    const placeholder = "Add some text"

    return <div className={styles.textbox} onClick={() => setEditable(true)}>
        <textarea className={styles.textbox}>{placeholder || value}</textarea>
    </div>
}