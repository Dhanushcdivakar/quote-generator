import React, { useState, useEffect } from 'react';

// This file assumes a separate 'api.js' or similar service file exists
// For this example, we'll mock the generateQuoteAPI function.
// In a real application, this would be an API call to a backend service.
const generateQuoteAPI = async (payload) => {
    console.log("Generating quote with payload:", payload);
    return new Blob(["Mock PDF content"], { type: 'application/pdf' });
};

// Helper function to get the initial form state from local storage or use defaults
const getInitialFormState = () => {
    try {
        const savedForm = localStorage.getItem('quoteForm');
        if (savedForm) {
            return JSON.parse(savedForm);
        }
    } catch (error) {
        console.error('Failed to retrieve form state from local storage', error);
    }
    return {
        customerName: '',
        description: '',
        rate: 0,
        factor: 1, // New field added
        passes: 1,
    };
};

// Helper function to get the initial items state from local storage or use defaults
const getInitialItemsState = () => {
    try {
        const savedItems = localStorage.getItem('quoteItems');
        if (savedItems) {
            return JSON.parse(savedItems);
        }
    } catch (error) {
        console.error('Failed to retrieve items state from local storage', error);
    }
    return [
        {
            pathLengthArea: 0,
            thickness: '1',
            passes: 1,
            quantity: 1,
        },
    ];
};

export default function QuoteForm() {
    // Initialize state from local storage
    const [form, setForm] = useState(getInitialFormState);
    const [items, setItems] = useState(getInitialItemsState);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Use useEffect to save state to local storage whenever form or items change
    useEffect(() => {
        try {
            localStorage.setItem('quoteForm', JSON.stringify(form));
        } catch (error) {
            console.error('Failed to save form to local storage', error);
        }
    }, [form]);

    useEffect(() => {
        try {
            localStorage.setItem('quoteItems', JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save items to local storage', error);
        }
    }, [items]);

    // Handle changes for the main form fields
    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    // Handle changes for the dynamic table items
    function handleItemChange(e, index) {
        const { name, value } = e.target;
        const newItems = [...items];
        newItems[index][name] = value;
        setItems(newItems);
    }

    // Add a new row to the items table
    function addItemRow() {
        setItems(prevItems => [
            ...prevItems,
            {
                pathLengthArea: 0,
                thickness: '1',
                passes: 1,
                quantity: 1,
            },
        ]);
    }

    // Remove a row from the items table
    function removeItemRow(index) {
        const newItems = [...items];
        if (newItems.length > 1) {
            newItems.splice(index, 1);
            setItems(newItems);
        }
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const payload = {
                ...form,
                items,
            };

            const blob = await generateQuoteAPI(payload);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quote-${Date.now()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            // Clear local storage and reset form after successful export
            localStorage.removeItem('quoteForm');
            localStorage.removeItem('quoteItems');
            setForm(getInitialFormState());
            setItems(getInitialItemsState());

        } catch (err) {
            console.error('Failed to generate quote:', err);
            setMessage('Failed to generate quote. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Calculate the total units based on the user's formula
    const totalUnits = items.reduce((sum, item) => {
        const pathLength = parseFloat(item.pathLengthArea) || 0;
        const thickness = parseFloat(item.thickness) || 0;
        const passes = parseFloat(item.passes) || 0;
        const factor = parseFloat(form.factor) || 1;
        
        // Units = (Path Length * Thickness / Factor) * Number of Passes
        const units = (pathLength * thickness / factor) * passes;
        return sum + units;
    }, 0);

    // Calculate the estimated cost based on the user's full formula
    const estimatedCost = items.reduce((sum, item) => {
        const pathLength = parseFloat(item.pathLengthArea) || 0;
        const thickness = parseFloat(item.thickness) || 0;
        const passes = parseFloat(item.passes) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(form.rate) || 0;
        const factor = parseFloat(form.factor) || 1;

        // Step 1: Calculate Units
        const units = (pathLength * thickness / factor) * passes;

        // Step 2: Calculate Final Price for this item
        const itemPrice = units * rate * quantity;
        
        return sum + itemPrice;
    }, 0);

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">Quote Generator</h1>
                {message && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{message}</span>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    {/* Main Form Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
                            <input
                                id="customerName"
                                type="text"
                                name="customerName"
                                value={form.customerName}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <input
                                id="description"
                                type="text"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label htmlFor="rate" className="block text-sm font-medium text-gray-700">Rate</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    ₹ per mm
                                </span>
                                <input
                                    id="rate"
                                    type="text"
                                    name="rate"
                                    value={form.rate}
                                    onChange={handleChange}
                                    required
                                    className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                />
                            </div>
                        </div>
                        {/* New Factor Field */}
                        <div className="col-span-2 md:col-span-1">
                            <label htmlFor="factor" className="block text-sm font-medium text-gray-700">Factor</label>
                            <input
                                id="factor"
                                type="number"
                                name="factor"
                                value={form.factor}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">No. of Settings</label>
                            <div className="mt-1 flex rounded-md shadow-sm space-x-2">
                                {/* Buttons for passes 1 to 4 only */}
                                {[1, 2, 3, 4].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, passes: num }))}
                                        className={`flex-1 px-4 py-2 text-center rounded-lg transition-colors duration-200 ${
                                            form.passes === num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pricing Table */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Pricing</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Path Length/Area
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thickness (mm)
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        No. of Passes
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="text"
                                                name="pathLengthArea"
                                                value={item.pathLengthArea}
                                                onChange={(e) => handleItemChange(e, index)}
                                                required
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                name="thickness"
                                                value={item.thickness}
                                                onChange={(e) => handleItemChange(e, index)}
                                                required
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            >
                                                <option value="">Select...</option>
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                name="passes"
                                                value={item.passes}
                                                onChange={(e) => handleItemChange(e, index)}
                                                required
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            >
                                                {[1, 2, 3, 4, 5].map(num => (
                                                    <option key={num} value={num}>{num}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(e, index)}
                                                required
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                type="button"
                                                onClick={() => removeItemRow(index)}
                                                className="text-red-600 hover:text-red-900"
                                                disabled={items.length === 1}
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-start">
                        <button
                            type="button"
                            onClick={addItemRow}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                            + Add Row
                        </button>
                    </div>

                    {/* Totals and Actions */}
                    <div className="mt-6 border-t pt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-700">Total Units</span>
                            <span className="text-lg font-bold text-gray-900">
                                {totalUnits.toFixed(3)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">Estimated Cost</span>
                            <span className="text-lg font-bold text-gray-900">
                                ₹ {estimatedCost.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-300 ease-in-out disabled:bg-gray-400"
                        >
                            {loading ? 'Generating...' : 'Export'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
