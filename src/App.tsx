import React from 'react';
import './App.css';
import Graph from './Graph';
import BasicRichTreeView from './Tree';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* <Graph></Graph> */}
        <BasicRichTreeView />
      </header>
    </div>
  );
}

export default App;
