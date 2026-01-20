import Popover from './components/popover'
import Prompt from './components/prompt'

function App(): React.JSX.Element {
  const view = new URLSearchParams(window.location.search).get('view')

  if (view === 'prompt') {
    return <Prompt />
  }

  // Default: activity log (backwards compatible)
  return <Popover />
}

export default App
