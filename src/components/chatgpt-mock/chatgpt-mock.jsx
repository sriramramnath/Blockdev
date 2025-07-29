import React from 'react';
import styles from './chatgpt-mock.css';

const ChatGPTMock = () => {
    return (
        <div className={styles.chatgptContainer}>
            <div className={styles.header}>
                <span className={styles.headerDecor}></span>
                MAXIMUS
                <span className={styles.headerDecor}></span>
            </div>
            <div className={styles.messagesContainer}>
                <div className={styles.message}>
                    <div className={styles.assistant}>
                        Ave! What counsel do you seek from the Oracle of Maximus?
                    </div>
                </div>
            </div>
            <div className={styles.inputArea}>
                <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="Inscribe your query to the Oracle..."
                    disabled
                />
                <button className={styles.sendButton} disabled>
                    ➤
                </button>
            </div>
        </div>
    );
};

export default ChatGPTMock;
