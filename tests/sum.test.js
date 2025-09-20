import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import sum from './sum.vue'

test('renders name and the counter', async () => {
  const { getByText, getByRole } = render(sum, {
    props: { name: 'Vitest' },
  })

  await expect.element(getByText('Hello Vitest x1!')).toBeInTheDocument()

  await getByRole('button', { name: 'Increment' }).click()

  await expect.element(getByText('Hello Vitest x2!')).toBeInTheDocument()
})
