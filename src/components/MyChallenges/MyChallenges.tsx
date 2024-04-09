// Dependencies
import { useEffect, useState } from 'react'
import { IoIosArrowBack } from 'react-icons/io'
import { useChallengeStore } from '../../stores/stores'

// Styles
import { useNavigate } from 'react-router-dom'
import useAsyncEffect from 'use-async-effect'
import {
  IncomingChallenge,
  acceptChallenge,
  checkForChallenges,
  rejectChallenge
} from '../../operations'
import './MyChallenges.scss'
import { discoverByIdentityKey } from '@babbage/sdk-ts'
import { Button, Stack } from '@mui/material'
import { toast } from 'react-toastify'
import { IdentityCard } from 'metanet-identity-react'
import React from 'react'

const MyChallenges = () => {
  const navigate = useNavigate()

  const [challenges, setChallenges, setFlipResult] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges,
    state.setFlipResult
  ])

  // Navigate back to home if there are no challenges
  useEffect(() => {
    challenges.length !== 0 || navigate('/')
  }, [challenges])

  return (
    <div className="container myChallengesContainer">
      <IoIosArrowBack color="white" className="backArrow" onClick={() => navigate('/')} />
      <h1>My Challenges</h1>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>Amount</th>
            <th>They picked</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {challenges &&
            challenges.map((challenge: IncomingChallenge, index: number) => {
              const { id, from, amount, tx, theirChoice, expires } = challenge
              return (
                <tr className="myChallengesItem" key={index}>
                  <td>
                    <div className="identityCard">
                      <IdentityCard identityKey={id} />
                    </div>
                  </td>
                  <td>{amount}</td>
                  <td>{theirChoice.charAt(0).toUpperCase() + theirChoice.slice(1)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      color="success"
                      style={{ marginRight: '.5rem' }}
                      onClick={async () => {
                        // Set global values to be used in Coinflip.tsx
                        // setChallengeValues({
                        //   from: from,
                        //   amount: amount,
                        //   theirChoice: theirChoice
                        // })
                        navigate('/coinflip')
                        const result = await acceptChallenge(challenge)
                        console.log('RESULT :', result)
                        setFlipResult(result)
                      }}
                    >
                      ✓
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => {
                        // clearTokenatorMessage(challenge.messageId)
                        toast(({ closeToast }) => (
                          <div>
                            <p style={{ color: 'black' }}>
                              Are you sure you want to remove this challenge?
                            </p>
                            <Stack direction="row" spacing={2} justifyContent="center">
                              <Button
                                variant="contained"
                                color="error"
                                onClick={async () => {
                                  closeToast()
                                  try {
                                    await rejectChallenge(challenge)
                                  } catch (e) {
                                    toast.error(`There was an error rejecting the challenege: ${e}`)
                                  }
                                  setChallenges(
                                    challenges.filter((challenge: any) => challenge.id !== id)
                                  )
                                  navigate('/')
                                }}
                              >
                                Delete
                              </Button>
                              <Button
                                variant="contained"
                                onClick={closeToast}
                                style={{ background: 'gray', color: 'white' }}
                              >
                                Cancel
                              </Button>
                            </Stack>
                          </div>
                        ))
                      }}
                    >
                      X
                    </Button>
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

export default MyChallenges
