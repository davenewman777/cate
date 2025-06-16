import React, { useEffect, useState, useRef } from 'react';

const NUM_ROWS = 12;
const NUM_COLUMNS = 7;
const API_BASE = 'https://catebackend1-f5bme0d7hgdta5ba.canadacentral-01.azurewebsites.net/api';

export default function App() {
  const [selections, setSelections] = useState(
    Array(NUM_COLUMNS).fill().map(() => Array(NUM_ROWS).fill(""))
  );
  const [slaOptions, setSlaOptions] = useState([]);
  const [slaMap, setSlaMap] = useState({});
  const [calculationModes, setCalculationModes] = useState(
    Array(NUM_COLUMNS).fill("AND")
  );
  const [zoneSelections, setZoneSelections] = useState(
    Array(NUM_COLUMNS).fill("No")
  );
  const [multiRegionSelections, setMultiRegionSelections] = useState(
    Array(NUM_COLUMNS).fill("No")
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

  const handleZoneChange = (colIndex, value) => {
    const updated = [...zoneSelections];
    updated[colIndex] = value;
    setZoneSelections(updated);
  };

  const handleMultiRegionChange = (colIndex, value) => {
    const updatedSelections = [...multiRegionSelections];
    updatedSelections[colIndex] = value;
    setMultiRegionSelections(updatedSelections);
  };

  const getSLA = (service) => slaMap[service] || "";

  const getCompositeSLA = (columnIndex) => {
    const slaValues = selections[columnIndex]
      .map(service => getSLA(service))
      .filter(Boolean);
    if (slaValues.length === 0) return "";

    let composite;
    if (calculationModes[columnIndex] === "AND") {
      composite = slaValues.reduce((acc, val) => acc * val, 1);
    } else if (calculationModes[columnIndex] === "OR") {
      composite = 1 - slaValues.reduce((acc, val) => acc * (1 - val), 1);
    }

    // Adjust for zones if 2 or 3 are selected
    const zones = parseInt(zoneSelections[columnIndex]);
    if (zones === 2 || zones === 3) {
      composite = 1 - Math.pow(1 - composite, zones);
    }

    return composite.toFixed(7);
  };

  const getTotalCompositeSLA = () => {
    const compositeSLAs = [...Array(NUM_COLUMNS)].map((_, colIndex) => getCompositeSLA(colIndex));
    const validSLAs = compositeSLAs.filter(sla => sla !== "");
    if (validSLAs.length === 0) return "";

    const totalComposite = validSLAs.reduce((acc, val) => acc * parseFloat(val), 1);
    return totalComposite.toFixed(7);
  };

// ...existing code...

  const calculateTotalMultiRegion = () => {
    // Gather composite SLAs for all selected regions
    const selectedSLAs = [];
    multiRegionSelections.forEach((selection, colIndex) => {
      if (selection === "Yes") {
        const compositeSLA = parseFloat(getCompositeSLA(colIndex) || 0);
        if (!isNaN(compositeSLA)) {
          selectedSLAs.push(compositeSLA);
        }
      }
    });
    if (selectedSLAs.length === 0) return "N/A";
    let combinedSLA;
    if (selectedSLAs.length === 1) {
      // Two regions with the same SLA (active-active)
      const sla = selectedSLAs[0];
      combinedSLA = 1 - Math.pow(1 - sla, 2);
    } else {
      // Multiple independent regions
      const allDownProbability = selectedSLAs.reduce((acc, sla) => acc * (1 - sla), 1);
      combinedSLA = 1 - allDownProbability;
    }
    return `${(combinedSLA * 100).toFixed(7)}%`;
  };

  const getTotalMultiRegionValue = () => {
    // Gather composite SLAs for all selected regions
    const selectedSLAs = [];
    multiRegionSelections.forEach((selection, colIndex) => {
      if (selection === "Yes") {
        const compositeSLA = parseFloat(getCompositeSLA(colIndex) || 0);
        if (!isNaN(compositeSLA)) {
          selectedSLAs.push(compositeSLA);
        }
      }
    });
    if (selectedSLAs.length === 0) return 0;
    if (selectedSLAs.length === 1) {
      const sla = selectedSLAs[0];
      return 1 - Math.pow(1 - sla, 2);
    } else {
      const allDownProbability = selectedSLAs.reduce((acc, sla) => acc * (1 - sla), 1);
      return 1 - allDownProbability;
    }
  };

// ...existing code...
  
    const getMultiRegionDowntimeMonth = () => {
      const total = getTotalMultiRegionValue();
      if (total === 0) return "";
      return `${(43200 * (1 - total)).toFixed(2)} mins`;
    };

  const getMultiRegionDowntimeDay = () => {
    const total = getTotalMultiRegionValue();
    if (total === 0) return "";
    return `${(1440 * (1 - total)).toFixed(2)} mins`;
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

  // --- Clear All Handler ---
  const handleClearAll = () => {
    setSelections(Array(NUM_COLUMNS).fill().map(() => Array(NUM_ROWS).fill("")));
    setCalculationModes(Array(NUM_COLUMNS).fill("AND"));
    setZoneSelections(Array(NUM_COLUMNS).fill("No"));
    setMultiRegionSelections(Array(NUM_COLUMNS).fill("No"));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-center">Composite Availability Target Estimator</h1>

      <div className="mb-4 flex gap-3 justify-end">
        <button
          onClick={handleClearAll}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Clear All
        </button>
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
                <React.Fragment key={colIndex}>
                  <th className="px-4 py-2 border text-center bg-gray-400 text-black">
                    Service
                  </th>
                  <th className="px-4 py-2 border text-center bg-gray-400 text-black">
                    SLA
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(NUM_ROWS)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(NUM_COLUMNS)].map((_, colIndex) => {
                  const selected = selections[colIndex][rowIndex];
                  return (
                    <React.Fragment key={colIndex}>
                      <td className="border px-2 py-1 text-center">
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
                      <td className="border px-2 py-1 text-center">
                        {selected ? `${(getSLA(selected) * 100).toFixed(3)}%` : ""}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}

            {/* Composite Headings Row */}
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

            {/* Deployment to # of Zones Row */}
            <tr className="bg-gray-200">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                colIndex === 0 ? (
                  <td key={`zone-label-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center text-sm"></td>
                ) : (
                  <React.Fragment key={colIndex}>
                    <td className="border px-2 py-2 text-center text-sm">
                      Deployment to # of Zones
                    </td>
                    <td className="border px-2 py-2 text-center text-sm">
                      <select
                        value={zoneSelections[colIndex]}
                        onChange={e => handleZoneChange(colIndex, e.target.value)}
                        className="w-20 border p-1"
                      >
                        <option value="No">No</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </td>
                  </React.Fragment>
                )
              ))}
            </tr>

            {/* AND/OR Row */}
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

            {/* Composite Availability Row */}
            <tr className="bg-gray-100 font-semibold">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                <React.Fragment key={colIndex}>
                  <td className="border px-2 py-2 text-center text-sm">
                    Composite Availability Target:
                  </td>
                  <td className="border px-2 py-2 text-center text-sm">
                    {(parseFloat(getCompositeSLA(colIndex) || 0) * 100).toFixed(9)}%
                  </td>
                </React.Fragment>
              ))}
              <td className="border px-2 py-2 text-center text-sm font-bold">
                Total Composite Availability:
              </td>
              <td className="border px-2 py-2 text-center text-sm font-bold">
                {(parseFloat(getTotalCompositeSLA() || 0) * 100).toFixed(9)}%
              </td>
            </tr>

            {/* Max Minutes of Downtime (Month) Row */}
            <tr className="bg-gray-100">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                <React.Fragment key={colIndex}>
                  <td className="border px-2 py-2 text-center text-sm">
                    Max Minutes of Downtime (Month):
                  </td>
                  <td className="border px-2 py-2 text-center text-sm">
                    {parseFloat(getCompositeSLA(colIndex) || 0) > 0
                      ? `${(43200 * (1 - parseFloat(getCompositeSLA(colIndex) || 0))).toFixed(2)} mins`
                      : ""}
                  </td>
                </React.Fragment>
              ))}
              <td className="border px-2 py-2 text-center text-sm font-bold">
                Total Max Minutes of Downtime (Month):
              </td>
              <td className="border px-2 py-2 text-center text-sm font-bold">
                {parseFloat(getTotalCompositeSLA() || 0) > 0
                  ? `${(43200 * (1 - parseFloat(getTotalCompositeSLA() || 0))).toFixed(2)} mins`
                  : ""}
              </td>
            </tr>

            {/* Max Minutes of Downtime (Day) Row */}
            <tr className="bg-gray-100">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                <React.Fragment key={colIndex}>
                  <td className="border px-2 py-2 text-center text-sm">
                    Max Minutes of Downtime (Day):
                  </td>
                  <td className="border px-2 py-2 text-center text-sm">
                    {parseFloat(getCompositeSLA(colIndex) || 0) > 0
                      ? `${(1440 * (1 - parseFloat(getCompositeSLA(colIndex) || 0))).toFixed(2)} mins`
                      : ""}
                  </td>
                </React.Fragment>
              ))}
              <td className="border px-2 py-2 text-center text-sm font-bold">
                Total Max Minutes of Downtime (Day):
              </td>
              <td className="border px-2 py-2 text-center text-sm font-bold">
                {parseFloat(getTotalCompositeSLA() || 0) > 0
                  ? `${(1440 * (1 - parseFloat(getTotalCompositeSLA() || 0))).toFixed(2)} mins`
                  : ""}
              </td>
            </tr>

            {/* Multiple Region Deployment Row */}
            <tr className="bg-gray-200 font-semibold">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                colIndex === 0 ? (
                  <td key={`multi-region-label-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center text-sm"></td>
                ) : (
                  <td key={`multi-region-label-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center text-sm">
                    Multiple Region Deployment
                  </td>
                )
              ))}
              <td colSpan={2} className="border px-2 py-2 text-center text-sm font-bold">
                Multiple Region Deployment
              </td>
            </tr>
            <tr className="bg-gray-100">
              {[...Array(NUM_COLUMNS)].map((_, colIndex) => (
                colIndex === 0 ? (
                  <td key={`multi-region-dropdown-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center"></td>
                ) : (
                  <td key={`multi-region-dropdown-${colIndex}`} colSpan={2} className="border px-2 py-2 text-center">
                    <select
                      value={multiRegionSelections[colIndex]}
                      className="w-40 border p-1"
                      onChange={(e) => handleMultiRegionChange(colIndex, e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </td>
                )
              ))}
              <td colSpan={2} className="border px-2 py-2 text-center font-bold">
                {calculateTotalMultiRegion()}
              </td>
            </tr>
            <tr className="bg-gray-100">
            {[...Array(NUM_COLUMNS * 2)].map((_, idx) => (
              <td key={`multi-region-downtime-month-${idx}`} className="border px-2 py-2 text-center text-sm"></td>
        ))}
            <td className="border px-2 py-2 text-center text-sm font-bold">
               Max Minutes of Downtime (Month):
           </td>
            <td className="border px-2 py-2 text-center text-sm font-bold">
               {getMultiRegionDowntimeMonth()}
            </td>
            </tr>
          <tr className="bg-gray-100">
              {[...Array(NUM_COLUMNS * 2)].map((_, idx) => (
                <td key={`multi-region-downtime-day-${idx}`} className="border px-2 py-2 text-center text-sm"></td>
       ))}
              <td className="border px-2 py-2 text-center text-sm font-bold">
              Max Minutes of Downtime (Day):
               </td>
                <td className="border px-2 py-2 text-center text-sm font-bold">
                      {getMultiRegionDowntimeDay()}
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}