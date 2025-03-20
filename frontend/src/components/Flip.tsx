import React from 'react'
import Lottie from 'react-lottie'
import coinflipAnimaion from '../assets/coinflipAnimation.json'

const Flip = () => {
    return <Lottie
        options={{
            loop: true,
            autoplay: true,
            animationData: coinflipAnimaion,
            rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice'
            }
        }}
        width={400}
    />
}

export default Flip
