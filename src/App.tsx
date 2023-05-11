import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { getIsCommand, getCommand } from './utils';

function App() {
  const [name, setName] = useState<string>();
  const [currentLayer, setCurrentLayer] = useState<{ [key: string]: any }>({});
  const [address, setAddress] = useState<string[]>([]);

  const [openedCommand, setOpenedCommand] = useState<{ [key: string]: any } | null>(null);
  const [description, setDescription] = useState<string>();

  const [consoleData, setConsoleData] = useState<string[]>([]);

  const SERVER_URL = useRef<string>();

  const getStatus = useCallback(async (isFirst?: boolean) => {
    const { data: { currentLayer, address, structure } } = await axios.get(`${SERVER_URL.current}/status${isFirst ? '?isFirst=true' : ''}`);
    setName(structure.__name);

    const filteredLayer = Object.keys(currentLayer)
      .filter(key => !key.startsWith('__'))
      .reduce<{ [key: string]: any }>((acc, key) => {
      acc[key] = currentLayer[key];

      return acc;
    }, {});

    setCurrentLayer(filteredLayer);
    setAddress(address);
    getStatus();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: config } = await axios.get('/config.json');

      SERVER_URL.current = `http://localhost:${config.SERVER_PORT}`;

      getStatus(true);
    })();
  }, [getStatus]);

  const goInside = useCallback((key: string) => {
    axios.post(`${SERVER_URL.current}/goInside`, { key });

    setOpenedCommand(null);
  }, []);

  const goBack = useCallback(() => {
    axios.post(`${SERVER_URL.current}/goBack`, {});

    setConsoleData([]);
    setOpenedCommand(null);
  }, []);

  const execute = useCallback(async () => {
    const { body: readableStream } = await fetch(`${SERVER_URL.current}/execute`, {
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
      if (typeof target === 'string' || Array.isArray(target)) {
        setDescription(undefined);
        return setOpenedCommand({ [key]: getCommand(target) });
      }

      setDescription(target.description);
      return setOpenedCommand({ [key]: getCommand(target.value) });
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

  const sectionsJSX = useMemo(() => {
    if (!renderSections.length) return <h2>{name}</h2>

    return <h2>{`${sections.length > 2 ? '... / ' : ''}${renderSections.join(' / ')}`}</h2>;
  }, [name, renderSections, sections.length]);

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
          {!!description && <div className='CommandDescription'>
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>}
          <div className='ConsoleHeader'>
            <button onClick={execute}>Run ▶</button>
            <span>If nothing is happening check your native console. There is may be you need to accept anything.</span>
          </div>
          <ul className='Console'>
            {consoleData.map((line, index) => (
              <li key={line + index}>{line}</li>
            ))}
          </ul>
        </div>}
      </main>
    </div>
  );
}

export default App;
