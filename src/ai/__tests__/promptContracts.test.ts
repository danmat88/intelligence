import { createHash } from 'crypto'
jest.mock('../../ai', () => ({ ai: {} }))
import { GENERAL_PRACTICE_SYSTEM } from '../../practice/general'
import {
  FOLLOWUP_SYSTEM,
  GUIDED_FOLLOWUP_SYSTEM,
  GUIDED_START_SYSTEM,
  READ_PROBLEM_IMAGE_SYSTEM,
  REVIEW_WORK_SYSTEM,
  SIMILAR_PROBLEM_SYSTEM,
  SOLVE_JSON_SYSTEM,
  VERIFY_SYSTEM,
} from '../../solve/prompt'

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

describe('AI proxy prompt contracts', () => {
  it.each([
    ['solve', SOLVE_JSON_SYSTEM, 'cc44622bb87f2999caa42eabdfac4a68f736c43d9698469bb61b6af615df3e23'],
    ['follow-up', FOLLOWUP_SYSTEM, 'f9648c381eed697e18a4b6c32d6a5a9d4be601c81adba3fc38a14e9f7c6f732b'],
    ['guided follow-up', GUIDED_FOLLOWUP_SYSTEM, '240cdeebe63b97f546a09dfb43a9a7b847d1f16bf2a88ae5babaf6270325c689'],
    ['similar problem', SIMILAR_PROBLEM_SYSTEM, '5266be9a8ce30d25f946f5dcc56f80e19b34dd939d9bc2765ad07fbc71a5de74'],
    ['guided start', GUIDED_START_SYSTEM, '413315d9eb29e8d3fabfb82e8b13ae4b1edc00fbff58e1207d53606a4f5dd81c'],
    ['image reading', READ_PROBLEM_IMAGE_SYSTEM, 'b5fc80f85738495d788728d46c65c489ee940c27bd21a50fa64c20bcee0c5f7c'],
    ['work review', REVIEW_WORK_SYSTEM, '89e903c35aaa42eb93faa55bdeab3dd8e31547cfb3cebc1c6d634aa738890a21'],
    ['verification', VERIFY_SYSTEM, 'dc3a1d7ae01e3132006dbc3c8a663cdf82291c72efe44397073ceed0ce0196e6'],
    ['general practice', GENERAL_PRACTICE_SYSTEM, 'daf4dce3c265e8111f16d751f8eacf64b01baf1b6296bd73ad8f9d5095fd085f'],
  ])('%s remains registered with the deployed proxy', (_name, prompt, expected) => {
    expect(sha256(prompt)).toBe(expected)
  })
})
