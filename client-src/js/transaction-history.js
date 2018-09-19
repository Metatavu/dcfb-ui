(() => {
  "use strict";

  /**
   * Class that handles autocomplete fields
   */
  class TransactionHistory {

    /**
     * Constructor
     * 
     * @param {jQuery} input original input
     * @param {Object} options options 
     */
    constructor() {
      this.start = moment().subtract(48, "hours").valueOf();
      this.end = moment().valueOf();
      this.tableRows = $("#transactionTableRows");
      this.rangeLocales = JSON.parse($("#rangeLocales").val());
      this.historyRoleSelect = $("#historyRoleSelect");
      this.role = this.historyRoleSelect.val();
      this.historyRoleSelect.on("change", this.onRoleChanged.bind(this));
      this.dateRangePicker = $("#historyDateRangePicker").daterangepicker({
        timePicker: true,
        timePicker24Hour: true,
        startDate: moment().subtract(48, "hours"),
        endDate: moment(),
        locale: {
          format: "DD.MM.YYYY H:mm"
        },
        ranges: {
          [this.rangeLocales["Today"]]: [moment().startOf("day"), moment().endOf("day")],
          [this.rangeLocales["Yesterday"]]: [moment().subtract(1, "days").startOf("day"), moment().subtract(1, "days").endOf("day")],
          [this.rangeLocales["Last 7 Days"]]: [moment().subtract(6, "days"), moment()],
          [this.rangeLocales["Last 30 Days"]]: [moment().subtract(29, "days"), moment()],
          [this.rangeLocales["This Month"]]: [moment().startOf("month"), moment().endOf("month")],
          [this.rangeLocales["Last Month"]]: [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")]
        }
      }, this.onDateRangeChanged.bind(this));
      this.updateTransactionTable();
    }

    async updateTransactionTable() {
      const data = await getJSON(`ajax/transactions?role=${this.role}&start=${this.start}&end=${this.end}`);
      this.tableRows.empty();
      data.forEach((transaction) => {
        const sellerData = JSON.parse(transaction.seller);
        const buyerData = JSON.parse(transaction.buyer);
        const amount = (transaction.amount / 100).toFixed(2);
        const time = moment(transaction.createdAt);
        this.tableRows.append(pugTransactionTableRow({
          seller: sellerData.firstName && sellerData.lastName ? `${sellerData.firstName} ${sellerData.lastName}` : sellerData.username,
          buyer: buyerData.name || buyerData["preferred_username"],
          description: transaction.description,
          amount: `${amount} €`,
          time: time.format("DD.MM.YYYY H:mm")
        }));

      })
    }

    onRoleChanged() {
      this.role = this.historyRoleSelect.val();
      this.updateTransactionTable()
    }

    onDateRangeChanged(start, end) {
      this.start = start.valueOf();
      this.end = end.valueOf();
      this.updateTransactionTable();
    }
  }

  $(document).ready(() => {
    new TransactionHistory();
  });

})();