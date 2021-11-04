import { makeObservable, observable, action, computed } from "mobx"
import cuid from 'cuid';

const { getImageElement } = require('./images')

class EditorState {
    objects = []
    selected = []

    dragActive = false

    constructor(title) {
        makeObservable(this, {
            objects: observable,
            selected: observable,
            dragActive: observable,
            select: action,
            initialize: action,
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

export {
    EditorState,
    Web3State
}