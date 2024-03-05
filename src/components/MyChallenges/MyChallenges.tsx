// Dependencies
import { useEffect } from 'react'
import { useChallengeStore } from '../../stores/stores'

// Types
import { Challenge } from '../../types/interfaces'

// Styles
import './MyChallenges.scss'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { clearTokenatorMessage } from "../../utils/tokenatorUtils"
// import { clearTokenatorMessage } from "../../utils/tokenatorUtils"

const MyChallenges = () => {
  const navigate = useNavigate()

  const [challenges, setChallenges] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges
  ])

  // Navigate back to home if there are no challenges
  useEffect(() => {
    challenges.length !== 0 || navigate('/')
  }, [challenges])

  return (
    <div className="container myChallengesContainer">
      <h1>My Challenges</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Sender</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {challenges.map((challenge: Challenge, index: number) => {
            const parsedChallengeBody = JSON.parse(challenge.body)
            console.log(challenge)

            return (
              <tr className="myChallengesItem" key={index}>
                <td>{challenge.messageId}</td>
                <td>{parsedChallengeBody.sender}</td>
                <td>{parsedChallengeBody.amount}</td>
                <td className="flex">
                  <Button variant="contained" color="success" style={{ marginRight: '.5rem' }}>
                    ✓
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      clearTokenatorMessage(challenge.messageId)
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
