import { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';
import axios from 'axios';

function App() {
  const molRef = useRef(null);
  const viewerRef = useRef(null);
  
  // Estados para Busca e Visualização
  const [inputValue, setInputValue] = useState("");
  const [smilesValue, setSmilesValue] = useState("");

  // Estados para Otimização (Backend)
  const [status, setStatus] = useState("Aguardando ação...");
  const [energia, setEnergia] = useState(null);
  const [loading, setLoading] = useState(false);

  // Geometria Inicial: Água Linear (Errada quimicamente)
  const geometriaInicial = [
    [0.0, 0.0, 0.0],  // O
    [0.0, 0.0, 1.0],  // H
    [0.0, 0.0, -1.0]  // H
  ];

  useEffect(() => {
    if (!molRef.current) return;
    
    // Inicializa o 3Dmol
    const element = molRef.current;
    element.innerHTML = ''; 
    const config = { backgroundColor: "white" };
    viewerRef.current = $3Dmol.createViewer(element, config);

    // Desenha a molécula inicial
    desenharMolecula(geometriaInicial);
  }, []);

  // Função para desenhar a partir de coordenadas (usada na otimização)
  const desenharMolecula = (coords) => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    viewer.removeAllModels();

    const xyz = `3
    Agua Teste
    O ${coords[0][0]} ${coords[0][1]} ${coords[0][2]}
    H ${coords[1][0]} ${coords[1][1]} ${coords[1][2]}
    H ${coords[2][0]} ${coords[2][1]} ${coords[2][2]}
    `;

    viewer.addModel(xyz, "xyz");
    viewer.setStyle({}, {sphere: {radius: 0.5}, stick: {radius: 0.2}});
    viewer.zoomTo();
    viewer.render();
  };

  // Função para carregar do PubChem (usada na busca)
  const loadMoleculeFromPubChem = (query) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.clear(); 
    
    $3Dmol.download(query, viewer, {}, function() {
      viewer.setStyle({}, {stick: {radius: 0.2}, sphere: {radius: 0.5}});
      viewer.zoomTo();
      viewer.render();
    });
  };

  const handleSearch = async () => {
    if (!inputValue) return;
    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${inputValue}/cids/JSON`;
      const response = await axios.get(url);
      if (response.data.IdentifierList?.CID) {
        loadMoleculeFromPubChem(`cid:${response.data.IdentifierList.CID[0]}`);
        setStatus("Molécula carregada do PubChem.");
      } else {
        alert("Molécula não encontrada!");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar molécula.");
    }
  };

  const handleSmilesBuild = async () => {
    if (!smilesValue) return;
    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smilesValue)}/cids/JSON`;
      const response = await axios.get(url);
      if (response.data.IdentifierList?.CID) {
        loadMoleculeFromPubChem(`cid:${response.data.IdentifierList.CID[0]}`);
        setStatus("Estrutura SMILES carregada.");
      } else {
        alert("Estrutura não encontrada.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar SMILES.");
    }
  };

  const handleOtimizar = async () => {
    // 1. Captura os dados da molécula atual do visualizador
    const viewer = viewerRef.current;
    if (!viewer) return;

    const model = viewer.getModel();
    if (!model || model.selectedAtoms({}).length === 0) {
      alert("Nenhuma molécula carregada para otimizar!");
      return;
    }

    const atoms = model.selectedAtoms({});
    const currentGeometry = atoms.map(atom => [atom.x, atom.y, atom.z]);
    const currentSymbols = atoms.map(atom => atom.elem).join(""); // Ex: "OHH" ou "CCCC..."

    setLoading(true);
    setStatus(`Enviando ${atoms.length} átomos para o MOPAC...`);

    try {
      const response = await axios.post('http://localhost:8000/otimizar', {
        simbolo: currentSymbols,
        geometria_inicial: currentGeometry
      });

      if (response.data.sucesso) {
        setStatus("Sucesso! Geometria Otimizada.");
        setEnergia(response.data.energia_final_ev);
        
        // Precisamos redesenhar mantendo os elementos corretos
        // O backend devolve apenas coordenadas, então reconstruímos o XYZ
        const novasCoords = response.data.novas_coordenadas;
        let xyz = `${atoms.length}\nOtimizado\n`;
        
        atoms.forEach((atom, i) => {
          xyz += `${atom.elem} ${novasCoords[i][0]} ${novasCoords[i][1]} ${novasCoords[i][2]}\n`;
        });

        viewer.removeAllModels();
        viewer.addModel(xyz, "xyz");
        viewer.setStyle({}, {sphere: {radius: 0.5}, stick: {radius: 0.2}});
        viewer.zoomTo();
        viewer.render();

      } else {
        setStatus("Erro no cálculo: " + response.data.erro);
      }
    } catch (error) {
      console.error(error);
      setStatus("Erro de conexão com o Backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>IC Química Web 2025</h1>
      
      {/* Área de Busca */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <input 
            type="text" 
            placeholder="Nome (ex: water)" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ padding: '8px', flex: 1 }}
          />
          <button onClick={handleSearch}>Buscar Nome</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <input 
            type="text" 
            placeholder="SMILES (ex: CCO)" 
            value={smilesValue}
            onChange={(e) => setSmilesValue(e.target.value)}
            style={{ padding: '8px', flex: 1 }}
          />
          <button onClick={handleSmilesBuild}>Construir SMILES</button>
        </div>
      </div>

      {/* Área de Otimização */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px dashed #ccc' }}>
        <h3>Teste de Otimização (Backend)</h3>
        <p>Status: {status}</p>
        {energia && <p>Energia: {energia.toFixed(4)} eV</p>}
        <button 
          onClick={handleOtimizar} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Calculando...' : 'Otimizar Molécula Atual'}
        </button>
      </div>
      
      <div 
        ref={molRef}
        className="molecule-viewer"
      ></div>
    </div>
  )
}

export default App