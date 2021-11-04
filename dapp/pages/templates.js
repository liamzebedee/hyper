import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Editor } from '../components/Editor/dynamic'
import { MEME_TEMPLATES } from '../config'

export default function Home() {
    return <>
        <Head>
            <title>HyperFab</title>
        </Head>

        {MEME_TEMPLATES.map(template => {
            
        })}
    </>
}
