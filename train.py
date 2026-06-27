"""
Train a CNN on MNIST and export weights to JSON for the 3D visualization.

Usage:
  pip install tensorflow numpy
  python train.py
"""
import json
import numpy as np
import tensorflow as tf

def build_model():
    model = tf.keras.Sequential([
        tf.keras.layers.InputLayer(input_shape=(28, 28, 1)),
        tf.keras.layers.Conv2D(8, 5, activation='relu'),
        tf.keras.layers.MaxPooling2D(2),
        tf.keras.layers.Conv2D(16, 5, activation='relu'),
        tf.keras.layers.MaxPooling2D(2),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(10, activation='softmax'),
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    return model

def export_weights(model, path='model/weights.json'):
    weights = {}
    for i, layer in enumerate(model.layers):
        w = layer.get_weights()
        if w:
            weights[layer.name] = [np.asarray(v).tolist() for v in w]
    with open(path, 'w') as f:
        json.dump(weights, f)
    print(f"Weights exported to {path}")

def main():
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0
    x_train = x_train[..., np.newaxis]
    x_test = x_test[..., np.newaxis]

    model = build_model()
    model.summary()
    model.fit(x_train, y_train, epochs=5, batch_size=128, validation_split=0.1)
    test_loss, test_acc = model.evaluate(x_test, y_test)
    print(f"Test accuracy: {test_acc:.4f}")
    export_weights(model)

if __name__ == '__main__':
    main()
