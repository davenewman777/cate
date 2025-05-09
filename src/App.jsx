import React, { useEffect, useState, useRef } from 'react';

const NUM_ROWS = 12;
const NUM_COLUMNS = 7;
const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [selections, setSelections] = useState(
    Array(NUM_COLUMNS).fill().map(() => Array(NUM_ROWS).fill(""))
  );
  const [slaOptions, setSlaOptions] = useState([]);
  const [slaMap, setSlaMap] = useState({});
  const [calculationModes, setCalculationModes] = useState(
    Array(NUM_COLUMNS).fill("AND") // Default to AND for all columns
  );
  const fileInputRef = useRef();

  useEffect(() => {
    fetch(`${API_BASE}/sla`)
      .then(res => res.json())
      .then(data => {
        setSlaOptions(data);
        const map = {};
        data.forEach(item => {
          map[item.service] = item.sla;
        });
        setSlaMap(map);
      });
  }, []);

  const handleChange = (col, row, value) => {
    const updated = [...selections];
    updated[col][row] = value;
    setSelections(updated);
  };

  const handleCalculationModeChange = (colIndex, mode) => {
    const updatedModes = [...calculationModes];
    updatedModes[colIndex] = mode;
    setCalculationModes(updatedModes);
  };

  const getSLA = (service) => slaMap[service] || "";

  const getCompositeSLA = (columnIndex) => {
    const slaValues = selections[columnIndex]
      .map(service => getSLA(service))
      .filter(Boolean);
    if (slaValues.length === 0) return "";

    if (calculationModes[columnIndex] === "AND") {
      // AND logic: Multiply all SLAs
      const composite = slaValues.reduce((acc, val) => acc * val, 1);
      return composite.toFixed(7);
    } else if (calculationModes[columnIndex] === "OR") {
      // OR logic: Calculate the likelihood that all resources are NOT offline
      const composite = 1 - slaValues.reduce((acc, val) => acc * (1 - val), 1);
      return composite.toFixed(7);
    }
  };

  const getTotalCompositeSLA = () => {
    const compositeSLAs = [...Array(NUM_COLUMNS)].map((_, colIndex) => getCompositeSLA(colIndex));
    const validSLAs = compositeSLAs.filter(sla => sla !== "");
    if (validSLAs.length === 0) return "";

    // AND logic for total composite SLA
    const totalComposite = validSLAs.reduce((acc, val) => acc * parseFloat(val), 1);
    return totalComposite.toFixed(7);
  };
  
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(selections)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sla_configuration.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const importConfig = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (Array.isArray(parsed) && parsed.length === NUM_COLUMNS) {
          setSelections(parsed);
        } else {
          alert("Invalid configuration format.");
        }
      } catch (error) {
        alert("Error parsing file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-center">Composite Availability Target Estimator</h1>

      <div className="mb-4 flex gap-3 justify-end">
        <button onClick={exportConfig} className="bg-blue-500 text-white px-3 py-1 rounded">
          Export Config
        </button>
        <button
          onClick={() => fileInputRef.current.click()}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          Import Config
        </button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={importConfig}
          style={{ display: "none" }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto border border-gray-300">
        <thead>
  <tr>
    {["Global Tier", "Web Tier", "API Tier", "Data Tier", "Security", "Network", "Hybrid Connectivity"].map((tierName, colIndex) => (
      <th
        key={colIndex}
        colSpan={2}
        className="px-4 py-2 border text-center bg-gray-400 text-black"
      >
        {tierName}
      </th>
    ))}
  </tr>
  <tr>
    {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
      <>
        <th key={`service-${colIndex}`} className="px-4 py-2 border text-center bg-gray-400 text-black">
          Service
        </th>
        <th key={`sla-${colIndex}`} className="px-4 py-2 border text-center bg-gray-400 text-black">
          SLA
        </th>
      </>
    ))}
  </tr>
</thead>
          <tbody>
            {[...Array(NUM_ROWS)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(NUM_COLUMNS)].map((_, colIndex) => {
                  const selected = selections[colIndex][rowIndex];
                  return (
                    <>
                      <td key={`service-${colIndex}-${rowIndex}`} className="border px-2 py-1 text-center">
                        <select
                          value={selected}
                          onChange={e => handleChange(colIndex, rowIndex, e.target.value)}
                          className="w-40 border p-1"
                        >
                          <option value="">-- Select --</option>
                          {slaOptions.map(opt => (
                            <option key={opt.service} value={opt.service}>
                              {opt.service} ({(opt.sla * 100).toFixed(3)}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td key={`sla-${colIndex}-${rowIndex}`} className="border px-2 py-1 text-center">
                        {selected ? `${(getSLA(selected) * 100).toFixed(3)}%` : ""}
                      </td>
                    </>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-400 text-black">
  {["Global Tier", "Web Tier", "API Tier", "Data Tier", "Security", "Network", "Hybrid Connectivity"].map((tierName, colIndex) => (
    <th key={`composite-heading-${colIndex}`} colSpan={2} className="px-4 py-2 border text-center">
      {tierName}
    </th>
  ))}
  <th colSpan={2} className="px-4 py-2 border text-center font-bold">
    Total
  </th>
</tr>
            <tr className="bg-gray-100 font-semibold">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                <td key={`calculation-mode-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center text-sm">
                  <label className="mr-4">
                    <input
                      type="radio"
                      name={`calculationMode-${colIndex}`}
                      value="AND"
                      checked={calculationModes[colIndex] === "AND"}
                      onChange={() => handleCalculationModeChange(colIndex, "AND")}
                      className="mr-1"
                    />
                    AND
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`calculationMode-${colIndex}`}
                      value="OR"
                      checked={calculationModes[colIndex] === "OR"}
                      onChange={() => handleCalculationModeChange(colIndex, "OR")}
                      className="mr-1"
                    />
                    OR
                  </label>
                </td>
              ))}
            </tr>
                <tr className="bg-gray-100 font-semibold">
                {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                  <>
                    <td key={`composite-label-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      Composite Availability:
                    </td>
                    <td key={`composite-value-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      {(parseFloat(getCompositeSLA(colIndex) || 0) * 100).toFixed(7)}%
                    </td>
                  </>
                ))}
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  Total Composite Availability:
                </td>
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  {(parseFloat(getTotalCompositeSLA() || 0) * 100).toFixed(7)}%
                </td>
              </tr>
              <tr className="bg-gray-100">
                {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                  <>
                    <td key={`downtime-month-label-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      Max Downtime (Month):
                    </td>
                    <td key={`downtime-month-value-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      {parseFloat(getCompositeSLA(colIndex) || 0) > 0
                        ? `${(43200 * (1 - parseFloat(getCompositeSLA(colIndex) || 0))).toFixed(2)} mins`
                        : ""}
                    </td>
                  </>
                ))}
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  Total Max Downtime (Month):
                </td>
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  {parseFloat(getTotalCompositeSLA() || 0) > 0
                    ? `${(43200 * (1 - parseFloat(getTotalCompositeSLA() || 0))).toFixed(2)} mins`
                    : ""}
                </td>
              </tr>
              <tr className="bg-gray-100">
                {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                  <>
                    <td key={`downtime-day-label-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      Max Downtime (Day):
                    </td>
                    <td key={`downtime-day-value-${colIndex}`} className="border px-2 py-2 text-center text-sm">
                      {parseFloat(getCompositeSLA(colIndex) || 0) > 0
                        ? `${(1440 * (1 - parseFloat(getCompositeSLA(colIndex) || 0))).toFixed(2)} mins`
                        : ""}
                    </td>
                  </>
                ))}
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  Total Max Downtime (Day):
                </td>
                <td className="border px-2 py-2 text-center text-sm font-bold">
                  {parseFloat(getTotalCompositeSLA() || 0) > 0
                    ? `${(1440 * (1 - parseFloat(getTotalCompositeSLA() || 0))).toFixed(2)} mins`
                    : ""}
                </td>
              </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}