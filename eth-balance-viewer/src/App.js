import React, { useEffect, useState } from "react";
import Web3 from "web3";
import "./App.css";

function App() {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const web3 = new Web3("http://127.0.0.1:8545");
        const accs = await web3.eth.getAccounts();
        const newBalances = {};

        for (const acc of accs) {
          const wei = await web3.eth.getBalance(acc);
          newBalances[acc] = web3.utils.fromWei(wei, "ether");
        }

        setAccounts(accs);
        setBalances(newBalances);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to connect to Web3 provider. Make sure your node is running.");
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <h2 style={{ textAlign: "center" }}>Loading balances...</h2>;
  if (error) return <h2 style={{ color: "red", textAlign: "center" }}>{error}</h2>;

  return (
    <div className="App">
      <h1>Ganache Ethereum Account Balances</h1>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Balance (ETH)</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc}>
              <td>{acc}</td>
              <td>{balances[acc]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
