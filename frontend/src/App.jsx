import { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';
import axios from 'axios';

function App() {
  const molRef = useRef(null);
  const viewerRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [smilesValue, setSmilesValue] = useState("");

  useEffect(() => {
    if (!molRef.current) return;

    // Inicializa o viewer se ainda não existir
    if (!viewerRef.current) {
      const element = molRef.current;
      const config = { backgroundColor: "white" };
      viewerRef.current = $3Dmol.createViewer(element, config);
    }

    // Carrega Cafeína como exemplo inicial
    loadMolecule("cid:2519");
  }, []);

  const loadMolecule = (query) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.clear(); // Limpa a visualização anterior
    
    $3Dmol.download(query, viewer, {}, function() {
      viewer.setStyle({}, {stick: {radius: 0.2}, sphere: {radius: 0.5}});
      viewer.zoomTo();
      viewer.render();
    });
  };

  const handleSearch = async () => {
    if (!inputValue) return;

    try {
      // Busca o CID no PubChem pelo nome (ex: water, aspirin)
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${inputValue}/cids/JSON`;
      const response = await axios.get(url);
      
      if (response.data.IdentifierList && response.data.IdentifierList.CID) {
        const cid = response.data.IdentifierList.CID[0];
        loadMolecule(`cid:${cid}`);
      } else {
        alert("Molécula não encontrada!");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar molécula. Tente usar o nome em inglês (ex: Water).");
    }
  };

  const handleSmilesBuild = async () => {
    if (!smilesValue) return;

    try {
      // 1. Busca o CID a partir do SMILES
      // O PubChem permite buscar por SMILES e retornar o CID
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smilesValue)}/cids/JSON`;
      const response = await axios.get(url);

      if (response.data.IdentifierList && response.data.IdentifierList.CID) {
        const cid = response.data.IdentifierList.CID[0];
        loadMolecule(`cid:${cid}`);
      } else {
        alert("Estrutura não encontrada para este código SMILES.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o código SMILES. Verifique se a sintaxe está correta.");
    }
  };

  return (
    <div className="app-container">
      <h1>IC Química Web 2025</h1>
      <p>Visualização com React + 3Dmol.js</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Busca por Nome */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Nome (inglês): water, aspirin..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <button onClick={handleSearch} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Buscar Nome
          </button>
        </div>

        {/* Construção por SMILES */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Código SMILES: CCO, C1=CC=CC=C1..." 
            value={smilesValue}
            onChange={(e) => setSmilesValue(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <button onClick={handleSmilesBuild} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
            Construir (SMILES)
          </button>
        </div>
        
        <small style={{ color: '#666' }}>
          Dica: Use <b>CCO</b> para Etanol, <b>C1=CC=CC=C1</b> para Benzeno.
        </small>

      </div>

      <div 
        ref={molRef}
        className="molecule-viewer"
      ></div>
    </div>
  )
}

export default App