import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/Components/Modal";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const tabs = ["Details", "Sale History"];

export default function CustomerDetailsModal({ customer, onClose }) {
  const [activeTab, setActiveTab] = useState("Details");
  const recentSales = useMemo(() => (customer?.sales || []).slice(0, 20), [customer]);

  useEffect(() => {
    if (customer) setActiveTab("Details");
  }, [customer]);

  return (
    <Modal show={Boolean(customer)} onClose={onClose} maxWidth="4xl">
      {customer && (
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Customer Details
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {customer.CustomerName || "-"}
              </p>
            </div>
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "Details" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">ID:</span>{" "}
                <span className="text-gray-900">{customer.ID}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Customer Name:</span>{" "}
                <span className="text-gray-900">{customer.CustomerName}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Customer Type:</span>{" "}
                <span className="text-gray-900">{customer.CustomerType}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Contact Details:</span>{" "}
                <span className="text-gray-900">{customer.ContactDetails}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Sales Records:</span>{" "}
                <span className="text-gray-900">{customer.SalesRecords ?? "-"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Date Added:</span>{" "}
                <span className="text-gray-900">
                  {formatDateTime(customer.DateAdded)}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Date Modified:</span>{" "}
                <span className="text-gray-900">
                  {formatDateTime(customer.DateModified)}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-700">Address:</span>{" "}
                <span className="text-gray-900">{customer.Address}</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Sale History
                </h4>
                <span className="text-xs text-gray-500">
                  Recent {recentSales.length} of {customer.SalesRecords ?? recentSales.length}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto rounded border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sale ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cashier
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {recentSales.map((sale) => {
                      const customOrderLines =
                        sale.job_order?.custom_items ||
                        sale.jobOrder?.customItems ||
                        sale.jobOrder?.custom_items ||
                        [];
                      return (
                        <tr key={sale.ID} className="align-top">
                          <td className="px-3 py-2 text-gray-900">#{sale.ID}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {sale.user?.FullName || "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            <div className="space-y-1">
                              {(sale.sold_products || []).map((line) => (
                                <p key={`sale-product-${sale.ID}-${line.ID}`}>
                                  {line.product?.ProductName || "-"} x{line.Quantity}
                                </p>
                              ))}
                              {customOrderLines.map((line) => (
                                <p
                                  key={`sale-custom-${sale.ID}-${line.ID}`}
                                  className="max-w-md whitespace-pre-wrap break-words"
                                >
                                  {line.CustomOrderDescription || "-"} x{line.Quantity}
                                </p>
                              ))}
                              {(sale.sold_products || []).length === 0 &&
                                customOrderLines.length === 0 && <p>-</p>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-900 font-medium">
                            {currency(sale.totalAmount)}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {sale.payment?.PaymentStatus || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {formatDateTime(sale.DateAdded)}
                          </td>
                        </tr>
                      );
                    })}
                    {recentSales.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-3 py-4 text-center text-gray-500">
                          No sales history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
