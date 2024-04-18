import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Header() {
    const [hoveredButton, setHoveredButton] = useState(null);
    const navigate = useNavigate();

    const handleMouseEnter = (buttonNumber) => {
        setHoveredButton(buttonNumber);
    };

    const handleMouseLeave = () => {
        setHoveredButton(null);
    };

    const navigateUpload = () => {
        navigate('/fileUploader');
    }
    const navigateUploadFromMap = () => {
        navigate('/fileUploaderFromMap');
    }

    const navigateHistory = () => {
        navigate('/history');
    }

    return (
        <div style={headerStyle.header}>
            <button
                style={hoveredButton === 1 ? { ...headerStyle.button, ...headerStyle.buttonHover } : headerStyle.button}
                onMouseEnter={() => handleMouseEnter(1)}
                onMouseLeave={handleMouseLeave}
                onClick={navigateUpload}
            >
                Upload Videos And Image
            </button>
            <button
                style={hoveredButton === 2 ? { ...headerStyle.button, ...headerStyle.buttonHover } : headerStyle.button}
                onMouseEnter={() => handleMouseEnter(2)}
                onMouseLeave={handleMouseLeave}
                onClick={navigateUploadFromMap}
            >
                Upload Videos With Map
            </button>
            <button
                style={hoveredButton === 3 ? { ...headerStyle.button, ...headerStyle.buttonHover } : headerStyle.button}
                onMouseEnter={() => handleMouseEnter(3)}
                onMouseLeave={handleMouseLeave}
            >
                Drone view
            </button>
            <button
                style={hoveredButton === 4 ? { ...headerStyle.button, ...headerStyle.buttonHover } : headerStyle.button}
                onMouseEnter={() => handleMouseEnter(4)}
                onMouseLeave={handleMouseLeave}
                onClick={navigateHistory}
            >
                History
            </button>
        </div>
    );
}

export default Header;

const headerStyle = {
    header: {
        backgroundColor: '#020831',
        padding: '10px',
        display: 'flex',
        justifyContent: 'space-around',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        color: 'white',
    },
    button: {
        backgroundColor: '#ccc',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        color: '#333',
        fontSize: '16px',
    },
    buttonHover: {
        backgroundColor: '#ddd',
    }
}