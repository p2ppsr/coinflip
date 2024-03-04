// Dependencies
import { useEffect } from 'react'
import { useChallengeStore } from '../../stores/stores'

// Types
import { Challenge } from '../../types/interfaces'

// Styles
import './MyChallenges.scss'
import { Button } from '@mui/material'

const MyChallenges = () => {
  const [challenges, setChallenges] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges
  ])

  useEffect(() => {
    
  }, [challenges])

  return (
    <div className="container myChallengesContainer">
      <h1>My Challenges</h1>
      <table>
        <thead>
          <tr>
            <th>Sender</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((challenge: Challenge, index: number) => {
            const parsedChallengeBody = JSON.parse(challenge.body)

            return (
              <tr className="myChallengesItem" key={index}>
                <td>{parsedChallengeBody.sender}</td>
                <td>{parsedChallengeBody.amount}</td>
                <td className="flex">
                  <Button variant="contained" color="success">
                    ✓
                  </Button>
                  <Button variant="contained" color="error">
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
