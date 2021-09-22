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
        ],
        currentSelection: 1
    })

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
        const ctx = canvas.current.getContext('2d');
        ctx.font = '50px serif';
        ctx.fillText('Hello world', 50, 90);
    }, [])
    return <div>
        <div>
            <input id="tool-text" type="checkbox" checked={true} />
            <label for="tool-text">text</label>
        </div>

        <div>
            <div className={styles.canvasContainer}>
                {state.objects}
                <canvas className={styles.canvas} width={750} height={750} onClick={handleOnClick} ref={canvas}></canvas>
            </div>

        </div>
    </div>
    
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