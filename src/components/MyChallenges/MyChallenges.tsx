// Dependencies
import { useEffect } from 'react'
import { useChallengeStore } from '../../stores/stores'
import { IoIosArrowBack } from 'react-icons/io'
import { toast } from 'react-toastify'

// Types
import { Challenge } from '../../types/interfaces'

// Styles
import './MyChallenges.scss'
import { Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import useChallenges from '../../utils/useChallenges'

const MyChallenges = () => {
  const navigate = useNavigate()

  const { challenges, clearChallenge } = useChallenges()

  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
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
            <th>ID</th>
            <th>Sender</th>
            <th>Amount</th>
            <th>They picked</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {challenges.map((challenge: Challenge, index: number) => {
            const { sender, amount, senderCoinChoice } = JSON.parse(challenge.body)

            return (
              <tr className="myChallengesItem" key={index}>
                <td>{challenge.messageId}</td>
                <td>{sender}</td>
                <td>{amount}</td>
                <td>{senderCoinChoice === 0 ? 'Heads' : 'Tails'}</td>
                <td className="flex">
                  <Button
                    variant="contained"
                    color="success"
                    style={{ marginRight: '.5rem' }}
                    onClick={() => {
                      // Set global values to used in Coinflip.tsx
                      setChallengeValues({
                        sender: sender,
                        amount: amount,
                        senderCoinChoice: senderCoinChoice
                      })
                      navigate('/coinflip')
                      clearChallenge(challenge.messageId)
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
                                await clearChallenge(challenge.messageId)
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
