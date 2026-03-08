
'use client';
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('./ThreeScene'), {
ssr: false,
});

export default DynamicComponent;
