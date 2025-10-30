import React, { useEffect, useState } from "react";
import Web3 from "web3";
import CrowdFundingABI from "./CrowdFundingABI.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { FaEdit, FaStar } from "react-icons/fa";
import Modal from "react-modal";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    goal: "",
    duration: "",
  });
  const [donation, setDonation] = useState({});
  const [rating, setRating] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [hover, setHover] = useState({});

  const loadWeb3 = async () => {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const loadBlockchainData = async () => {
    const web3 = window.web3;
    const accounts = await web3.eth.getAccounts();
    setAccount(accounts[0]);

    const networkId = await web3.eth.net.getId();
    const networkData = CrowdFundingABI.networks[networkId];
    if (!networkData) {
      toast.error("Smart contract not deployed on this network.");
      return;
    }

    const cf = new web3.eth.Contract(CrowdFundingABI.abi, networkData.address);
    setContract(cf);

    const count = await cf.methods.campaignCount().call();
    const allCampaigns = [];

    for (let i = 1; i <= count; i++) {
      try {
        const c = await cf.methods.getCampaign(i).call();
        const donorsData = await cf.methods.getDonors(i).call();

        const donors = Array.isArray(donorsData[0]) ? donorsData[0] : [];
        const amounts = Array.isArray(donorsData[1]) ? donorsData[1] : [];

        const donorsWithAmounts =
          donors.length > 0
            ? donors.map((d, idx) => ({
              donor: d,
              amount: parseFloat(Web3.utils.fromWei(amounts[idx] || "0", "ether")),
            }))
            : [];

        if (donorsWithAmounts.length > 0) donorsWithAmounts.sort((a, b) => b.amount - a.amount);

        let avgRating = 0;
        try {
          avgRating = await cf.methods.getAverageRating(i).call();
        } catch {
          avgRating = 0;
        }

        allCampaigns.push({
          id: i,
          ...c,
          avgRating,
          donors: donorsWithAmounts,
        });
      } catch (err) {
        console.error(`Error loading campaign ${i}:`, err);
      }
    }

    setCampaigns(allCampaigns);
  };

  useEffect(() => {
    loadWeb3().then(loadBlockchainData);
  }, []);

  const createCampaign = async () => {
    const { title, description, goal, duration } = form;
    if (!title || !goal || !duration) {
      toast.warn("Please fill all campaign details!");
      return;
    }
    try {
      await contract.methods
        .createCampaign(title, description, Web3.utils.toWei(goal, "ether"), Number(duration))
        .send({ from: account });
      toast.success("Campaign created successfully!");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Failed to create campaign");
    }
  };

  const donate = async (id) => {
    const amount = donation[id] || "0";
    if (parseFloat(amount) <= 0) {
      toast.warn("Please enter a valid donation amount!");
      return;
    }
    try {
      await contract.methods
        .donate(id)
        .send({ from: account, value: Web3.utils.toWei(amount, "ether") });
      toast.success(`Donated ${amount} ETH successfully!`);
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Donation failed");
    }
  };

  const cancelCampaign = async (id) => {
    try {
      await contract.methods.cancelCampaign(id).send({ from: account });
      toast.warn("Campaign cancelled and refunds issued!");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Cancel failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!modalInput) {
      toast.warn("Please enter a value!");
      return;
    }

    const { id, type } = activeModal;
    try {
      if (type === "title")
        await contract.methods.updateTitle(id, modalInput).send({ from: account });
      else if (type === "description")
        await contract.methods.updateDescription(id, modalInput).send({ from: account });
      else if (type === "goal")
        await contract.methods
          .updateGoal(id, Web3.utils.toWei(modalInput, "ether"))
          .send({ from: account });
      else if (type === "deadline")
        await contract.methods.extendDeadline(id, Number(modalInput)).send({ from: account });

      toast.success(`${type} updated successfully!`);
      setActiveModal(null);
      setModalInput("");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, `Failed to update ${type}`);
    }
  };

  const rate = async (id) => {
    try {
      const value = rating[id];
      await contract.methods.rateCampaign(id, Number(value)).send({ from: account });
      toast.success("Thanks for rating!");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Rating failed");
    }
  };

  const withdrawFunds = async (id) => {
    try {
      await contract.methods.withdrawFunds(id).send({ from: account });
      toast.success("Funds withdrawn successfully!");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Withdraw failed");
    }
  };

  const claimRefund = async (id) => {
    try {
      await contract.methods.claimRefund(id).send({ from: account });
      toast.success("Refund claimed successfully!");
      loadBlockchainData();
    } catch (error) {
      handleWeb3Error(error, "Refund failed");
    }
  };

  const handleWeb3Error = (error, contextMessage = "Transaction failed") => {
    console.error(error);
    if (error.code === 4001) {
      toast.info("Transaction rejected by user.");
      return;
    }
    if (error.message?.includes("reverted")) {
      toast.error(`${contextMessage}: Transaction reverted.`);
      return;
    }
    toast.error(`${contextMessage}.`);
  };

  const now = Math.floor(Date.now() / 1000);
  const activeCampaigns = campaigns.filter((c) => !c.cancelled && Number(c.deadline) > now);
  const completedCampaigns = campaigns.filter((c) => !c.cancelled && Number(c.deadline) <= now);
  const cancelledCampaigns = campaigns.filter((c) => c.cancelled);

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      <header className="app-header">
        <h1>DeCrowdFund</h1>
        <p className="connected">
          Connected:{" "}
          <span className={account ? "connected-addr" : "disconnected"}>
            {account || "Not connected"}
          </span>
        </p>
      </header>

      <section className="form-section">
        <h3>Create a Campaign</h3>
        <div className="form-grid">
          <label className="formlabels">Title</label>
          <input
            placeholder="Enter campaign title..."
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <label className="formlabels">Description</label>
          <textarea
            placeholder="Enter campaign description..."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="formlabels">Goal (ETH)</label>
          <input
            placeholder="Enter campaign goal in (ETH)..."
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
          />
          <label className="formlabels">Duration (Seconds)</label>
          <input
            placeholder="Enter campaign duration in seconds..."
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
        <button className="primary-btn" onClick={createCampaign}>
          Create Campaign
        </button>
      </section>

      <section className="campaigns-section-active">
        <h3>Active Campaigns</h3>
        {activeCampaigns.length === 0 ? (
          <p className="empty-message">No active campaigns yet.</p>
        ) : (
          <div className="campaign-grid">
            {activeCampaigns.map((c) => (
              <div key={c.id} className="campaign-card">
                <h4>
                  {c.title}{" "}
                  {account === c.owner && (
                    <FaEdit
                      className="edit-icon"
                      onClick={() => setActiveModal({ type: "title", id: c.id })}
                    />
                  )}
                </h4>
                <p>
                  {c.description}{" "}
                  {account === c.owner && (
                    <FaEdit
                      className="edit-icon"
                      onClick={() => setActiveModal({ type: "description", id: c.id })}
                    />
                  )}
                </p>

                <div className="details">
                  <p>
                    <b>Goal:</b> {Web3.utils.fromWei(c.goal, "ether")} ETH{" "}
                    {account === c.owner && (
                      <FaEdit
                        className="edit-icon"
                        onClick={() => setActiveModal({ type: "goal", id: c.id })}
                      />
                    )}
                  </p>
                  <p>
                    <b>Raised:</b> {Web3.utils.fromWei(c.amountCollected, "ether")} ETH
                  </p>
                  <p>
                    <b>Deadline:</b> {new Date(Number(c.deadline) * 1000).toLocaleString()}{" "}
                    {account === c.owner && (
                      <FaEdit
                        className="edit-icon"
                        onClick={() => setActiveModal({ type: "deadline", id: c.id })}
                      />
                    )}
                  </p>
                  <p>
                    <b>Avg Rating:</b> {(Number(c.avgRating) / 100).toFixed(2)}/5
                  </p>
                </div>

                <div className="donors">
                  <h5>Top Donors:</h5>
                  {c.donors.length === 0 ? (
                    <p className="no-donors">No donations yet.</p>
                  ) : (
                    <ul>
                      {c.donors.slice(0, 3).map((d, idx) => (
                        <li key={idx}>
                          {d.donor.slice(0, 6)}... — {d.amount} ETH
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="actions">
                  <input
                    placeholder="Donate ETH"
                    onChange={(e) => setDonation({ ...donation, [c.id]: e.target.value })}
                  />
                  <button onClick={() => donate(c.id)}>Donate</button>
                </div>

                {account === c.owner && (
                  <div className="owner-actions">
                    <button className="cancel" onClick={() => cancelCampaign(c.id)}>
                      Cancel Campaign
                    </button>
                  </div>
                )}

                {account !== c.owner && (
                  <button className="refund-btn" onClick={() => claimRefund(c.id)}>
                    Claim Refund
                  </button>
                )}

                {account !== c.owner && (
                  <div className="rate-section">
                    <h5>Rate this Campaign</h5>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          className={`star ${(hover[c.id] || rating[c.id]) >= star ? "active" : ""
                            }`}
                          onClick={() => setRating({ ...rating, [c.id]: star })}
                          onMouseEnter={() => setHover({ ...hover, [c.id]: star })}
                          onMouseLeave={() => setHover({ ...hover, [c.id]: 0 })}
                        />
                      ))}
                    </div>
                    <button onClick={() => rate(c.id)}>Submit Rating</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="campaigns-section-completed">
        <h3>Completed Campaigns</h3>
        {completedCampaigns.length === 0 ? (
          <p className="empty-message">No completed campaigns yet.</p>
        ) : (
          <div className="campaign-grid">
            {completedCampaigns.map((c) => (
              <div key={c.id} className="campaign-card completed-card">
                <h4>{c.title}</h4>
                <p>{c.description}</p>
                <p><b>Goal:</b> {Web3.utils.fromWei(c.goal, "ether")} ETH</p>
                <p><b>Raised:</b> {Web3.utils.fromWei(c.amountCollected, "ether")} ETH</p>
                <p><b>Ended:</b> {new Date(Number(c.deadline) * 1000).toLocaleString()}</p>
                <p><b>Avg Rating:</b> {(Number(c.avgRating) / 100).toFixed(2)}/5</p>

                {account === c.owner && c.amountCollected > 0 &&(
                  <button className="withdraw-btn" onClick={() => withdrawFunds(c.id)}>
                    Withdraw Funds
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="campaigns-section-cancelled">
        <h3>Cancelled Campaigns</h3>
        {cancelledCampaigns.length === 0 ? (
          <p className="empty-message">No cancelled campaigns yet.</p>
        ) : (
          <div className="campaign-grid">
            {cancelledCampaigns.map((c) => (
              <div key={c.id} className="campaign-card cancelled-card">
                <h4>{c.title}</h4>
                <p>{c.description}</p>
                <p><b>Goal:</b> {Web3.utils.fromWei(c.goal, "ether")} ETH</p>
                <p><b>Raised:</b> {Web3.utils.fromWei(c.amountCollected, "ether")} ETH</p>
                <p><b>Status:</b> Cancelled</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={!!activeModal}
        onRequestClose={() => setActiveModal(null)}
        className="modal"
        overlayClassName="overlay"
        ariaHideApp={false}
      >
        <h3>Edit {activeModal?.type}</h3>
        <input
          placeholder={`New ${activeModal?.type}`}
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
        />
        <div className="modal-buttons">
          <button onClick={handleSaveEdit}>Save</button>
          <button onClick={() => setActiveModal(null)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
