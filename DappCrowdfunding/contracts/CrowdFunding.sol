// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrowdFunding {
    struct Campaign {
        address payable owner;
        string title;
        string description;
        uint goal;
        uint deadline;
        uint amountCollected;
        bool goalReached;
        bool cancelled;
        mapping(address => uint) contributions;
        address[] donors;
        uint totalRatings;
        uint ratingCount;
    }

    uint public campaignCount = 0;
    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => uint8)) public ratings;

    event CampaignCreated(uint id, address owner, uint goal, uint deadline);
    event CampaignUpdated(uint id, string field);
    event ContributionReceived(uint id, address contributor, uint amount);
    event FundsWithdrawn(uint id, uint amount);
    event RefundClaimed(uint id, address contributor, uint amount);
    event CampaignCancelled(uint id);
    event CampaignRated(uint id, address rater, uint8 rating);

    function createCampaign(
        string memory _title,
        string memory _description,
        uint _goal,
        uint _durationInSeconds
    ) public {
        require(_goal > 0, "Goal must be >0");
        campaignCount++;
        Campaign storage c = campaigns[campaignCount];
        c.owner = payable(msg.sender);
        c.title = _title;
        c.description = _description;
        c.goal = _goal;
        c.deadline = block.timestamp + _durationInSeconds;
        emit CampaignCreated(campaignCount, msg.sender, _goal, c.deadline);
    }

    function cancelCampaign(uint _id) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only owner can cancel");
        require(!c.cancelled, "Already cancelled");
        c.cancelled = true;
        for (uint i = 0; i < c.donors.length; i++) {
            address donor = c.donors[i];
            uint amount = c.contributions[donor];
            if (amount > 0) {
                c.contributions[donor] = 0;
                payable(donor).transfer(amount);
            }
        }
        emit CampaignCancelled(_id);
    }

    function donate(uint _id) public payable {
        Campaign storage c = campaigns[_id];
        require(!c.cancelled, "Cancelled");
        require(block.timestamp < c.deadline, "Deadline passed");
        require(msg.value > 0, "Zero donation");

        if (c.contributions[msg.sender] == 0) {
            c.donors.push(msg.sender);
        }

        c.contributions[msg.sender] += msg.value;
        c.amountCollected += msg.value;
        emit ContributionReceived(_id, msg.sender, msg.value);
    }

    function updateTitle(uint _id, string memory _newTitle) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only owner");
        c.title = _newTitle;
        emit CampaignUpdated(_id, "title");
    }

    function updateDescription(uint _id, string memory _newDesc) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only owner");
        c.description = _newDesc;
        emit CampaignUpdated(_id, "description");
    }

    function updateGoal(uint _id, uint _newGoal) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only owner");
        require(_newGoal > c.amountCollected, "Goal must exceed collected");
        c.goal = _newGoal;
        emit CampaignUpdated(_id, "goal");
    }

    function extendDeadline(uint _id, uint _extraSeconds) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only owner");
        require(_extraSeconds > 0, "Must add time");
        c.deadline += _extraSeconds;
        emit CampaignUpdated(_id, "deadline extended");
    }

    function withdrawFunds(uint _id) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Not owner");
        require(block.timestamp >= c.deadline, "Not ended");
        require(!c.cancelled, "Cancelled");
        require(!c.goalReached, "Already withdrawn");

        c.goalReached = true;
        uint amount = c.amountCollected;
        c.amountCollected = 0;
        c.owner.transfer(amount);
        emit FundsWithdrawn(_id, amount);
    }

    function claimRefund(uint _id) public {
        Campaign storage c = campaigns[_id];
        uint contributed = c.contributions[msg.sender];
        require(contributed > 0, "Nothing to refund");
        c.contributions[msg.sender] = 0;
        c.amountCollected -= contributed;
        payable(msg.sender).transfer(contributed);

        for (uint i = 0; i < c.donors.length; i++) {
            if (c.donors[i] == msg.sender) {
                c.donors[i] = c.donors[c.donors.length - 1];
                c.donors.pop();
                break;
            }
        }

        emit RefundClaimed(_id, msg.sender, contributed);
    }

    function rateCampaign(uint _id, uint8 _rating) public {
        Campaign storage c = campaigns[_id];
        uint8 prev = ratings[_id][msg.sender];
        if (prev > 0) {
            c.totalRatings = c.totalRatings - prev + _rating;
        } else {
            c.totalRatings += _rating;
            c.ratingCount++;
        }
        ratings[_id][msg.sender] = _rating;
        emit CampaignRated(_id, msg.sender, _rating);
    }

    function getAverageRating(uint _id) public view returns (uint) {
        Campaign storage c = campaigns[_id];
        if (c.ratingCount == 0) return 0;
        return (c.totalRatings * 100) / c.ratingCount;
    }

    function getCampaign(
        uint _id
    )
        public
        view
        returns (
            address owner,
            string memory title,
            string memory description,
            uint goal,
            uint deadline,
            uint amountCollected,
            bool goalReached,
            bool cancelled,
            uint donorCount,
            uint averageRating
        )
    {
        Campaign storage c = campaigns[_id];
        return (
            c.owner,
            c.title,
            c.description,
            c.goal,
            c.deadline,
            c.amountCollected,
            c.goalReached,
            c.cancelled,
            c.donors.length,
            getAverageRating(_id)
        );
    }

    function getDonors(
        uint _id
    ) public view returns (address[] memory, uint[] memory) {
        Campaign storage c = campaigns[_id];
        uint len = c.donors.length;
        address[] memory donors = new address[](len);
        uint[] memory amounts = new uint[](len);
        for (uint i = 0; i < len; i++) {
            donors[i] = c.donors[i];
            amounts[i] = c.contributions[donors[i]];
        }
        return (donors, amounts);
    }
}
