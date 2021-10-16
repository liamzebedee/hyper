import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Editor } from '../components/Editor/dynamic'

export default function Home() {
  return <>
    <Head>
      <title>HyperFab</title>
    </Head>

    <div className={styles.container}>
      <Editor />
    </div>
  </>
}
