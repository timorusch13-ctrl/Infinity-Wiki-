/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const LoadingSkeleton: React.FC = () => {
  const barStyle: React.CSSProperties = {
    height: '1rem',
    backgroundColor: '#e0e0e0', // Light gray
    marginBottom: '0.75rem',
  };

  return (
    <div aria-label="Inhalt wird geladen..." role="progressbar">
      <div style={{ ...barStyle, width: '100%' }}></div>
      <div style={{ ...barStyle, width: '83.33%' }}></div>
      <div style={{ ...barStyle, width: '100%' }}></div>
      <div style={{ ...barStyle, width: '75%' }}></div>
      <div style={{ ...barStyle, width: '66.66%' }}></div>
    </div>
  );
};

export default LoadingSkeleton;