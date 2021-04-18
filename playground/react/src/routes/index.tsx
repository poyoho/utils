import React from "react"
import { Route, HashRouter, Link, Switch } from "react-router-dom"

const route: React.FC = () => {
  return (
    <HashRouter>
      <div className="links">
        <Link to="/">Home</Link>
      </div>
      <hr/>
      <Switch>
        <Route path="/"></Route>
      </Switch>
    </HashRouter>
  )
}


export default route
