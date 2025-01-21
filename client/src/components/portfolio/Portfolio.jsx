import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import './Portfolio.css';
import folderIcon from '../../assets/folder.svg';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
};

const Folder = ({ id, left, top, isMobile }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    disabled: isMobile // Disabilitiamo il drag and drop su mobile
  });

  // Applichiamo stili solo se non è mobile per mantenere il drag and drop funzionante
  const style = isMobile ? {} : {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    left: left,
    top: top,
    position: 'absolute' // Manteniamo la posizione assoluta per il drag and drop
  };

  return (
    <div ref={setNodeRef} style={style} {...(isMobile ? {} : listeners)} {...attributes} className={`folder ${isMobile ? 'mobile' : ''}`}>
      <img src={folderIcon} alt="Folder Icon" width="50" height="50" className="folder-icon" />
      <div className="folder-name">{id}</div>
    </div>
  );
};

function Portfolio() {
  const isMobile = useIsMobile();

  const [folders, setFolders] = useState([
    { id: 'Progetto1', left: 100, top: 100 },
    { id: 'Progetto2', left: 300, top: 100 },
    { id: 'Progetto3', left: 100, top: 250 },
    { id: 'Progetto4', left: 300, top: 250 },
    { id: 'Progetto5', left: 100, top: 400 },
    { id: 'Progetto6', left: 300, top: 400 },
  ]);

  function handleDragEnd(event) {
    if (isMobile) return; // Non facciamo nulla su mobile
    const { active, delta } = event;
    setFolders(folders.map(folder => 
      folder.id === active.id ? 
        {
          ...folder,
          left: folder.left + delta.x,
          top: folder.top + delta.y
        } : folder
    ));
  }

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={`portfolio-section ${isMobile ? 'mobile' : ''}`}>
        {folders.map((folder) => (
          <Folder key={folder.id} id={folder.id} left={folder.left} top={folder.top} isMobile={isMobile} />
        ))}
      </div>
    </DndContext>
  );
}

export default Portfolio;