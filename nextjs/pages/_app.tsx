import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'

const MTProto = require('@mtproto/core/envs/browser');

function MyApp({ Component, pageProps }: AppProps) {

  console.log('Test', MTProto)
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp
