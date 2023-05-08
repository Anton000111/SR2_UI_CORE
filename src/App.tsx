import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import axios from 'axios';
import { getIsCommand, getCommand } from './utils';



function App() {
  const [currentLayer, setCurrentLayer] = useState<{ [key: string]: any }>({});
  const [address, setAddress] = useState<string[]>([]);

  const [openedCommand, setOpenedCommand] = useState<{ [key: string]: any } | null>(null);

  const [consoleData, setConsoleData] = useState<string[]>([]);

  const getStatus = useCallback(async (isFirst?: boolean) => {
    const { data: { currentLayer, address } } = await axios.get(`http://localhost:5001/status${isFirst ? '?isFirst=true' : ''}`);
    setCurrentLayer(currentLayer);
    setAddress(address);
    getStatus();
  }, []);

  useEffect(() => {
    getStatus(true);
  }, [getStatus]);

  const goInside = useCallback((key: string) => {
    axios.post('http://localhost:5001/goInside', { key });

    setOpenedCommand(null);
  }, []);

  const goBack = useCallback(() => {
    axios.post('http://localhost:5001/goBack', {});

    setConsoleData([]);
    setOpenedCommand(null);
  }, []);

  const execute = useCallback(async () => {
    const { body: readableStream } = await fetch('http://localhost:5001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: Object.keys(openedCommand!)[0] }),
    });

    if (!readableStream) return;

    let goNext = true;

    const reader = readableStream.getReader();

    while (goNext) {
      const { value, done } = await reader.read();

      const stringValue = new TextDecoder().decode(value);

      setConsoleData(prev => [...prev, ...stringValue.split('\n')]);

      goNext = !done;
    }
  }, [openedCommand]);

  const goInsideOrOpen = useCallback((key: string) => {
    setConsoleData([]);
    const target = currentLayer[key];

    if (getIsCommand(target)) {
      return setOpenedCommand({ [key]: target });
    }

    goInside(key);
  }, [currentLayer, setOpenedCommand, goInside]);

  const currentLayerKeys = useMemo(() => (
    Object.keys(currentLayer)
  ), [currentLayer]);

  const sections = useMemo(() => (
    address.filter((_item, index, arr) => index !== arr.length - 1)
  ), [address]);

  const renderSections = [sections[sections.length - 2], sections[sections.length - 1]].filter(Boolean);

  const sectionsJSX = !!renderSections.length && (
    <h2>{`${sections.length > 2 ? '... / ' : ''}${renderSections.join(' / ')}`}</h2>
  );

  const listJSX = currentLayerKeys.map(key => {
    const target = currentLayer[key];
    let tail = '...';
    let title = `Section: ${key}`;

    if (getIsCommand(target)) {
      title = `Executable command: ${key}`;
      tail = '▹';
    }

    return (
      <li key={key} title={title} onClick={() => goInsideOrOpen(key)}>
        <span>{key}</span>
        <span>{tail}</span>
      </li>
    );
  });

  return (
    <div className="App">
      <header>
        {sectionsJSX}
      </header>
      <main>
        <nav>
          <ul>
            {listJSX}
          </ul>

          {!!sections.length && <button onClick={goBack}><span>⇤</span><span>Back</span></button>}
        </nav>
        {openedCommand && <div className='Description'>
          <h3>{Object.keys(openedCommand)[0]}</h3>
          <div className='Command'><h4>Command:</h4> <span>{getCommand(Object.values(openedCommand)[0])}</span></div>
          <button onClick={execute}>Execute</button>
          <ul className='Console'>
            {consoleData.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>}
      </main>
    </div>
  );
}

export default App;
